#!/bin/bash
# =============================================================================
# 高可用监控脚本
# =============================================================================
# 用途: 持续监控高可用系统状态，可用于 cron 定时任务
# 
# 使用方法:
#   ./monitor-ha.sh [--continuous] [--interval SECONDS] [--alert]
# 
# Cron 示例:
#   */5 * * * * /opt/idp-cms/deploy/scripts/monitor-ha.sh --alert >> /var/log/idp-ha-monitor.log 2>&1
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONTINUOUS=false
INTERVAL=60
ENABLE_ALERT=false
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --continuous) CONTINUOUS=true; shift ;;
        --interval) INTERVAL=$2; shift 2 ;;
        --alert) ENABLE_ALERT=true; shift ;;
        *) shift ;;
    esac
done

log_info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} [INFO] $1"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} [SUCCESS] $1"; }
log_warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} [WARNING] $1"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} [ERROR] $1"; }

# 发送告警
send_alert() {
    local subject=$1
    local message=$2
    
    if [ "$ENABLE_ALERT" = true ]; then
        # 邮件告警
        if command -v mail &> /dev/null; then
            echo "$message" | mail -s "[IDP-CMS HA] $subject" "$ALERT_EMAIL"
            log_info "告警邮件已发送到 $ALERT_EMAIL"
        fi
        
        # Webhook 告警（可选）
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\": \"[IDP-CMS HA] $subject\\n$message\"}" \
                &> /dev/null || true
        fi
        
        # 企业微信告警（可选）
        if [ -n "$WECHAT_WEBHOOK_URL" ]; then
            curl -X POST "$WECHAT_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"msgtype\": \"text\", \"text\": {\"content\": \"[IDP-CMS HA] $subject\\n$message\"}}" \
                &> /dev/null || true
        fi
    fi
}

# 监控 PostgreSQL
monitor_postgres() {
    local status="OK"
    local message=""
    
    # 检查主库
    if docker ps | grep -q "ha-postgres-master"; then
        if ! docker exec ha-postgres-master pg_isready -U news &> /dev/null; then
            status="CRITICAL"
            message="PostgreSQL 主库不可用"
            log_error "$message"
            send_alert "PostgreSQL 主库故障" "$message"
        else
            # 检查复制状态
            replica_count=$(docker exec ha-postgres-master psql -U news -d news_ha -t -c \
                "SELECT count(*) FROM pg_stat_replication;" 2>/dev/null | xargs || echo "0")
            
            if [ "$replica_count" -eq 0 ]; then
                status="WARNING"
                message="PostgreSQL 无从库连接"
                log_warning "$message"
            else
                log_success "PostgreSQL 主库正常，$replica_count 个从库连接"
            fi
        fi
    fi
    
    # 检查从库
    if docker ps | grep -q "ha-postgres-replica"; then
        if ! docker exec ha-postgres-replica pg_isready -U news &> /dev/null; then
            status="WARNING"
            message="PostgreSQL 从库不可用"
            log_warning "$message"
        else
            # 检查复制延迟
            lag=$(docker exec ha-postgres-replica psql -U news -d news_ha -t -c \
                "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null | xargs || echo "999")
            
            if (( $(echo "$lag > 300" | bc -l) )); then
                status="CRITICAL"
                message="PostgreSQL 复制延迟严重: ${lag}秒"
                log_error "$message"
                send_alert "PostgreSQL 复制延迟" "$message"
            elif (( $(echo "$lag > 60" | bc -l) )); then
                status="WARNING"
                message="PostgreSQL 复制延迟: ${lag}秒"
                log_warning "$message"
            else
                log_success "PostgreSQL 从库正常，延迟: ${lag}秒"
            fi
        fi
    fi
    
    echo "$status"
}

# 监控 Redis
monitor_redis() {
    local status="OK"
    
    # 检查主节点
    if docker ps | grep -q "redis-master"; then
        if docker exec node1-redis-master redis-cli -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
            ping 2>/dev/null | grep -q "PONG"; then
            
            # 检查内存使用
            mem_used=$(docker exec node1-redis-master redis-cli -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
                info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "unknown")
            log_success "Redis 主节点正常，内存使用: $mem_used"
        else
            status="CRITICAL"
            log_error "Redis 主节点不可用"
            send_alert "Redis 主节点故障" "Redis 主节点无法连接"
        fi
    fi
    
    # 检查 Sentinel
    local sentinel_count=$(docker ps --filter "label=role=sentinel" | wc -l)
    if [ $sentinel_count -lt 2 ]; then
        status="WARNING"
        log_warning "Sentinel 节点不足: $sentinel_count"
    else
        log_success "Sentinel 集群正常: $sentinel_count 个节点"
    fi
    
    echo "$status"
}

# 监控应用服务
monitor_applications() {
    local status="OK"
    local failed_count=0
    
    # 检查后端服务
    for node in 1 2; do
        if docker ps | grep -q "node${node}-authoring"; then
            if ! curl -sf http://localhost:800$((node-1))/health/readiness/ &> /dev/null; then
                status="CRITICAL"
                failed_count=$((failed_count + 1))
                log_error "节点$node Django 服务不可用"
            else
                log_success "节点$node Django 服务正常"
            fi
            
            if ! curl -sf http://localhost:300$((node-1))/api/health &> /dev/null; then
                status="WARNING"
                log_warning "节点$node Next.js 服务不可用"
            else
                log_success "节点$node Next.js 服务正常"
            fi
        fi
    done
    
    if [ $failed_count -ge 2 ]; then
        send_alert "应用服务全部故障" "所有应用节点都不可用"
    elif [ $failed_count -eq 1 ]; then
        send_alert "应用服务部分故障" "部分应用节点不可用，系统降级运行"
    fi
    
    echo "$status"
}

# 监控资源使用
monitor_resources() {
    log_info "资源使用情况:"
    
    # CPU使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    log_info "CPU 使用率: ${cpu_usage}%"
    
    # 内存使用率
    mem_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100)}')
    log_info "内存使用率: ${mem_usage}%"
    
    # 磁盘使用率
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    log_info "磁盘使用率: ${disk_usage}%"
    
    # 告警阈值
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warning "CPU 使用率过高"
        send_alert "CPU 使用率告警" "CPU 使用率: ${cpu_usage}%"
    fi
    
    if (( $(echo "$mem_usage > 85" | bc -l) )); then
        log_warning "内存使用率过高"
        send_alert "内存使用率告警" "内存使用率: ${mem_usage}%"
    fi
    
    if [ $disk_usage -gt 85 ]; then
        log_warning "磁盘使用率过高"
        send_alert "磁盘使用率告警" "磁盘使用率: ${disk_usage}%"
    fi
}

# 监控 Docker 容器
monitor_containers() {
    log_info "检查容器状态..."
    
    # 统计容器状态
    local total=$(docker ps -a | wc -l)
    local running=$(docker ps | wc -l)
    local stopped=$((total - running))
    
    log_info "容器总数: $total, 运行中: $running, 已停止: $stopped"
    
    # 检查异常退出的容器
    exited_containers=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | grep "idp-cms\|node\|ha-" || true)
    if [ -n "$exited_containers" ]; then
        log_warning "发现异常退出的容器:"
        echo "$exited_containers" | while read container; do
            log_warning "  - $container"
            
            # 获取退出原因
            exit_code=$(docker inspect -f '{{.State.ExitCode}}' $container)
            if [ "$exit_code" != "0" ]; then
                send_alert "容器异常退出" "容器 $container 异常退出，退出码: $exit_code"
            fi
        done
    fi
}

# 生成监控报告
generate_report() {
    local postgres_status=$(monitor_postgres)
    local redis_status=$(monitor_redis)
    local app_status=$(monitor_applications)
    
    echo ""
    echo "========================================="
    echo "  高可用系统监控报告"
    echo "========================================="
    echo "时间: $(date)"
    echo ""
    echo "组件状态:"
    echo "  PostgreSQL: $postgres_status"
    echo "  Redis:      $redis_status"
    echo "  应用服务:    $app_status"
    echo ""
    
    monitor_resources
    echo ""
    monitor_containers
    echo ""
    echo "========================================="
}

# 主函数
main() {
    if [ "$CONTINUOUS" = true ]; then
        log_info "启动持续监控模式，间隔: ${INTERVAL}秒"
        
        while true; do
            generate_report
            sleep $INTERVAL
        done
    else
        generate_report
    fi
}

main

