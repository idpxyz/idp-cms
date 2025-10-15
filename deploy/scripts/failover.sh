#!/bin/bash
# =============================================================================
# 故障转移脚本
# =============================================================================
# 用途: 执行手动或自动故障转移
# 支持: PostgreSQL 提升从库、Redis Sentinel 切换
# 
# 使用方法:
#   ./failover.sh [postgres|redis] [--force]
# 
# 示例:
#   ./failover.sh postgres        # 提升 PostgreSQL 从库为主库
#   ./failover.sh redis --force   # 强制 Redis 故障转移
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

COMPONENT=$1
FORCE=false

[ "$2" = "--force" ] && FORCE=true

# PostgreSQL 故障转移
failover_postgres() {
    log_warning "执行 PostgreSQL 故障转移..."
    
    # 确认操作
    if [ "$FORCE" = false ]; then
        echo ""
        echo "⚠️  警告: 此操作将提升从库为主库，原主库将无法自动恢复！"
        echo ""
        read -p "确认要继续吗？(yes/no): " confirm
        [ "$confirm" != "yes" ] && log_info "已取消操作" && exit 0
    fi
    
    # 检查从库是否存在
    if ! docker ps | grep -q "ha-postgres-replica"; then
        log_error "PostgreSQL 从库容器不存在或未运行"
        exit 1
    fi
    
    # 检查从库状态
    log_info "检查从库状态..."
    if ! docker exec ha-postgres-replica pg_isready -U news &> /dev/null; then
        log_error "从库未就绪，无法提升"
        exit 1
    fi
    
    # 检查复制延迟
    log_info "检查复制延迟..."
    delay=$(docker exec ha-postgres-replica psql -U news -d news_ha -t -c \
        "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null || echo "999")
    
    if (( $(echo "$delay > 60" | bc -l) )); then
        log_warning "复制延迟较大: ${delay}秒"
        if [ "$FORCE" = false ]; then
            read -p "是否继续？(y/n): " continue
            [ "$continue" != "y" ] && exit 0
        fi
    else
        log_success "复制延迟正常: ${delay}秒"
    fi
    
    # 提升从库为主库
    log_info "提升从库为主库..."
    docker exec ha-postgres-replica pg_ctl promote
    
    # 等待提升完成
    sleep 5
    
    # 验证提升成功
    if docker exec ha-postgres-replica psql -U news -d news_ha -c \
        "SELECT pg_is_in_recovery();" | grep -q "f"; then
        log_success "从库已成功提升为主库"
        
        # 更新应用配置
        log_info "请更新应用配置指向新主库"
        log_info "新主库地址: $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ha-postgres-replica)"
        
        # 提示后续操作
        echo ""
        echo "后续操作:"
        echo "1. 更新环境变量中的 POSTGRES_HOST"
        echo "2. 重启应用容器"
        echo "3. 修复原主库并将其配置为新从库"
        echo ""
    else
        log_error "提升失败"
        exit 1
    fi
}

# Redis 故障转移
failover_redis() {
    log_warning "执行 Redis 故障转移..."
    
    # 检查 Sentinel
    if ! docker ps | grep -q "redis-sentinel"; then
        log_error "Redis Sentinel 未运行"
        exit 1
    fi
    
    # 获取主节点信息
    log_info "获取当前主节点信息..."
    master_info=$(docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
        sentinel get-master-addr-by-name mymaster 2>/dev/null || true)
    
    if [ -z "$master_info" ]; then
        log_error "无法获取主节点信息"
        exit 1
    fi
    
    log_info "当前主节点: $master_info"
    
    # 确认操作
    if [ "$FORCE" = false ]; then
        echo ""
        read -p "确认要执行故障转移吗？(yes/no): " confirm
        [ "$confirm" != "yes" ] && log_info "已取消操作" && exit 0
    fi
    
    # 执行故障转移
    log_info "执行 Sentinel 故障转移..."
    docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
        sentinel failover mymaster
    
    # 等待故障转移完成
    log_info "等待故障转移完成..."
    sleep 10
    
    # 获取新主节点信息
    new_master_info=$(docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
        sentinel get-master-addr-by-name mymaster 2>/dev/null || true)
    
    if [ "$master_info" != "$new_master_info" ]; then
        log_success "故障转移成功"
        log_info "新主节点: $new_master_info"
    else
        log_warning "主节点未变更，可能故障转移失败"
    fi
    
    # 显示复制状态
    log_info "当前复制拓扑:"
    docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
        sentinel replicas mymaster
}

# 显示故障转移状态
show_failover_status() {
    echo ""
    echo "========================================="
    echo "  故障转移状态"
    echo "========================================="
    echo ""
    
    if docker ps | grep -q "postgres"; then
        echo "PostgreSQL 状态:"
        docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}"
        echo ""
    fi
    
    if docker ps | grep -q "redis"; then
        echo "Redis 状态:"
        docker ps --filter "name=redis" --format "table {{.Names}}\t{{.Status}}"
        echo ""
    fi
    
    if docker ps | grep -q "sentinel"; then
        echo "Sentinel 主节点信息:"
        docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
            sentinel master mymaster 2>/dev/null | head -20 || true
        echo ""
    fi
    
    echo "========================================="
}

# 使用说明
show_usage() {
    echo "用法: $0 [postgres|redis|status] [--force]"
    echo ""
    echo "命令:"
    echo "  postgres    提升 PostgreSQL 从库为主库"
    echo "  redis       执行 Redis Sentinel 故障转移"
    echo "  status      显示故障转移状态"
    echo ""
    echo "选项:"
    echo "  --force     跳过确认提示，强制执行"
    echo ""
    echo "示例:"
    echo "  $0 postgres           # 手动提升 PostgreSQL"
    echo "  $0 redis --force      # 强制 Redis 故障转移"
    echo "  $0 status             # 查看状态"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  高可用故障转移工具"
    echo "========================================="
    echo ""
    
    case $COMPONENT in
        postgres)
            failover_postgres
            ;;
        redis)
            failover_redis
            ;;
        status)
            show_failover_status
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    log_success "操作完成"
}

main

