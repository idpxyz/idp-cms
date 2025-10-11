#!/bin/bash

###############################################################################
# 服务监控脚本
# 监控容器、服务和资源使用情况
###############################################################################

set -e

COMPOSE_FILE="${1:-infra/production/docker-compose.yml}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 发送告警
send_alert() {
    local title="$1"
    local message="$2"
    
    echo -e "${RED}🚨 告警：$title${NC}"
    echo "$message"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "[$HOSTNAME] $title" "$ALERT_EMAIL"
    fi
}

# 检查容器状态
check_containers() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🐳 容器状态检查${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local all_healthy=true
    
    # 获取所有容器
    containers=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | jq -r '.Name' 2>/dev/null || docker compose -f "$COMPOSE_FILE" ps -q)
    
    if [ -z "$containers" ]; then
        echo -e "${RED}❌ 没有运行的容器${NC}"
        send_alert "容器检查失败" "没有找到运行的容器"
        return 1
    fi
    
    for container in $containers; do
        # 获取容器状态
        status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
        health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container" 2>/dev/null || echo "unknown")
        
        # 显示状态
        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ] || [ "$health" = "no-healthcheck" ]; then
                echo -e "  ${GREEN}✅${NC} $container: $status"
            elif [ "$health" = "starting" ]; then
                echo -e "  ${YELLOW}⏳${NC} $container: $status (health: $health)"
            else
                echo -e "  ${RED}❌${NC} $container: $status (health: $health)"
                all_healthy=false
                send_alert "容器不健康" "容器 $container 状态异常: $health"
            fi
        else
            echo -e "  ${RED}❌${NC} $container: $status"
            all_healthy=false
            send_alert "容器停止" "容器 $container 已停止: $status"
        fi
    done
    
    echo ""
    
    if $all_healthy; then
        echo -e "${GREEN}✅ 所有容器运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ 发现容器异常${NC}"
        return 1
    fi
}

# 检查资源使用
check_resources() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 资源使用情况${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # CPU 使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo -e "  💻 CPU 使用率: ${cpu_usage}%"
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo -e "    ${RED}⚠️  CPU 使用率过高！${NC}"
        send_alert "CPU 使用率告警" "当前 CPU 使用率: ${cpu_usage}%"
    fi
    
    # 内存使用
    memory_info=$(free -h | awk 'NR==2')
    memory_total=$(echo $memory_info | awk '{print $2}')
    memory_used=$(echo $memory_info | awk '{print $3}')
    memory_percent=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    
    echo -e "  🧠 内存使用: $memory_used / $memory_total (${memory_percent}%)"
    
    if (( $(echo "$memory_percent > 85" | bc -l) )); then
        echo -e "    ${RED}⚠️  内存使用率过高！${NC}"
        send_alert "内存使用率告警" "当前内存使用率: ${memory_percent}%"
    fi
    
    # 磁盘使用
    disk_info=$(df -h / | awk 'NR==2')
    disk_used=$(echo $disk_info | awk '{print $3}')
    disk_total=$(echo $disk_info | awk '{print $2}')
    disk_percent=$(echo $disk_info | awk '{print $5}' | tr -d '%')
    
    echo -e "  💾 磁盘使用: $disk_used / $disk_total (${disk_percent}%)"
    
    if [ "$disk_percent" -gt 85 ]; then
        echo -e "    ${RED}⚠️  磁盘使用率过高！${NC}"
        send_alert "磁盘使用率告警" "当前磁盘使用率: ${disk_percent}%"
    fi
    
    echo ""
    
    # Docker 资源使用
    echo -e "${BLUE}🐳 Docker 容器资源使用${NC}"
    echo ""
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
}

# 检查服务可用性
check_services() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🌐 服务可用性检查${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # 检查后端
    if curl -sf http://localhost:8000/api/health/ > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} 后端 API (8000): 正常"
    else
        echo -e "  ${RED}❌${NC} 后端 API (8000): 无响应"
        send_alert "后端 API 无响应" "无法访问 http://localhost:8000/api/health/"
    fi
    
    # 检查前端
    if curl -sf http://localhost:3001/ > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} 前端服务 (3001): 正常"
    else
        echo -e "  ${RED}❌${NC} 前端服务 (3001): 无响应"
        send_alert "前端服务无响应" "无法访问 http://localhost:3001/"
    fi
    
    # 检查数据库
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} PostgreSQL: 正常"
    else
        echo -e "  ${RED}❌${NC} PostgreSQL: 无响应"
        send_alert "PostgreSQL 无响应" "数据库连接失败"
    fi
    
    # 检查 Redis
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} Redis: 正常"
    else
        echo -e "  ${RED}❌${NC} Redis: 无响应"
        send_alert "Redis 无响应" "Redis 连接失败"
    fi
    
    echo ""
}

# 检查日志错误
check_logs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📝 最近错误日志${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # 检查后端错误
    error_count=$(docker compose -f "$COMPOSE_FILE" logs authoring --tail=100 2>&1 | grep -i "error\|exception\|critical" | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️${NC} 后端发现 $error_count 条错误日志（最近100行）"
        echo ""
        echo "  最近的错误："
        docker compose -f "$COMPOSE_FILE" logs authoring --tail=100 2>&1 | grep -i "error\|exception\|critical" | tail -5 | sed 's/^/    /'
    else
        echo -e "  ${GREEN}✅${NC} 后端日志正常"
    fi
    
    echo ""
}

# 生成报告
generate_report() {
    local report_file="monitor-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "服务监控报告"
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "主机名: $HOSTNAME"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        check_containers 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo ""
        check_resources 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo ""
        check_services 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
    } > "$report_file"
    
    echo -e "${GREEN}📄 报告已保存: $report_file${NC}"
}

# 主函数
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║          📊 系统监控报告                                              ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "主机: $HOSTNAME"
    echo ""
    
    check_containers
    echo ""
    
    check_resources
    echo ""
    
    check_services
    echo ""
    
    check_logs
    echo ""
    
    # 询问是否生成报告
    if [ -t 0 ]; then  # 如果是交互式终端
        read -p "是否生成详细报告？(yes/no): " GEN_REPORT
        if [ "$GEN_REPORT" = "yes" ]; then
            generate_report
        fi
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 监控完成"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 运行
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [docker-compose.yml路径]"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认配置"
    echo "  $0 infra/local/docker-compose.yml   # 指定配置文件"
    echo ""
    echo "环境变量:"
    echo "  ALERT_EMAIL  设置告警邮箱"
    echo ""
    exit 0
fi

main

