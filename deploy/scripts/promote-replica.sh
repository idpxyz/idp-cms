#!/bin/bash
# =============================================================================
# PostgreSQL 从库提升脚本
# =============================================================================
# 用途: 提升 PostgreSQL 从库为主库（更详细的版本）
# 
# 使用方法:
#   ./promote-replica.sh [--check-only] [--force]
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

CHECK_ONLY=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --check-only) CHECK_ONLY=true; shift ;;
        --force) FORCE=true; shift ;;
        *) shift ;;
    esac
done

# 检查从库状态
check_replica_status() {
    log_info "检查从库状态..."
    
    # 检查容器是否运行
    if ! docker ps | grep -q "ha-postgres-replica"; then
        log_error "从库容器未运行"
        return 1
    fi
    
    # 检查 PostgreSQL 是否就绪
    if ! docker exec ha-postgres-replica pg_isready -U news &> /dev/null; then
        log_error "从库 PostgreSQL 未就绪"
        return 1
    fi
    
    # 检查是否处于恢复模式
    is_in_recovery=$(docker exec ha-postgres-replica psql -U news -d news_ha -t -c \
        "SELECT pg_is_in_recovery();" | xargs)
    
    if [ "$is_in_recovery" != "t" ]; then
        log_warning "从库已经是主库模式"
        return 1
    fi
    
    log_success "从库状态正常"
    return 0
}

# 检查复制延迟
check_replication_lag() {
    log_info "检查复制延迟..."
    
    lag=$(docker exec ha-postgres-replica psql -U news -d news_ha -t -c \
        "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null | xargs)
    
    if [ -z "$lag" ] || [ "$lag" = "" ]; then
        log_warning "无法获取复制延迟"
        return 0
    fi
    
    log_info "当前复制延迟: ${lag} 秒"
    
    if (( $(echo "$lag > 60" | bc -l) )); then
        log_warning "复制延迟较大 (> 60秒)"
        return 1
    elif (( $(echo "$lag > 10" | bc -l) )); then
        log_warning "复制延迟中等 (> 10秒)"
        return 2
    else
        log_success "复制延迟正常 (< 10秒)"
        return 0
    fi
}

# 备份当前配置
backup_config() {
    log_info "备份当前配置..."
    
    local backup_dir="/tmp/postgres-promote-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # 备份 postgresql.conf
    docker cp ha-postgres-replica:/var/lib/postgresql/data/postgresql.conf \
        "$backup_dir/postgresql.conf" 2>/dev/null || true
    
    # 备份 pg_hba.conf
    docker cp ha-postgres-replica:/var/lib/postgresql/data/pg_hba.conf \
        "$backup_dir/pg_hba.conf" 2>/dev/null || true
    
    log_success "配置已备份到: $backup_dir"
}

# 提升从库
promote_replica() {
    log_warning "开始提升从库为主库..."
    
    # 执行提升
    log_info "执行 pg_ctl promote..."
    docker exec ha-postgres-replica pg_ctl promote -D /var/lib/postgresql/data
    
    # 等待提升完成
    local max_wait=30
    local waited=0
    
    while [ $waited -lt $max_wait ]; do
        is_in_recovery=$(docker exec ha-postgres-replica psql -U news -d news_ha -t -c \
            "SELECT pg_is_in_recovery();" 2>/dev/null | xargs)
        
        if [ "$is_in_recovery" = "f" ]; then
            log_success "提升完成，从库现在是主库"
            return 0
        fi
        
        sleep 1
        waited=$((waited + 1))
        echo -n "."
    done
    
    log_error "提升超时"
    return 1
}

# 更新配置
update_config() {
    log_info "更新主库配置..."
    
    # 启用归档（如果未启用）
    docker exec ha-postgres-replica psql -U news -d news_ha -c \
        "ALTER SYSTEM SET archive_mode = 'on';" || true
    
    docker exec ha-postgres-replica psql -U news -d news_ha -c \
        "ALTER SYSTEM SET archive_command = 'test ! -f /archive/%f && cp %p /archive/%f';" || true
    
    # 重载配置
    docker exec ha-postgres-replica psql -U news -d news_ha -c "SELECT pg_reload_conf();"
    
    log_success "配置已更新"
}

# 验证提升
verify_promotion() {
    log_info "验证提升结果..."
    
    # 检查是否为主库
    is_primary=$(docker exec ha-postgres-replica psql -U news -d news_ha -t -c \
        "SELECT NOT pg_is_in_recovery();" | xargs)
    
    if [ "$is_primary" != "t" ]; then
        log_error "验证失败：仍处于恢复模式"
        return 1
    fi
    
    # 检查是否可写
    docker exec ha-postgres-replica psql -U news -d news_ha -c \
        "CREATE TABLE IF NOT EXISTS promote_test (id serial);" &> /dev/null
    docker exec ha-postgres-replica psql -U news -d news_ha -c \
        "DROP TABLE IF EXISTS promote_test;" &> /dev/null
    
    log_success "验证通过：新主库可正常读写"
    
    # 显示复制槽
    log_info "当前复制槽:"
    docker exec ha-postgres-replica psql -U news -d news_ha -c \
        "SELECT slot_name, slot_type, active FROM pg_replication_slots;" || true
}

# 显示后续步骤
show_next_steps() {
    local new_master_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ha-postgres-replica)
    
    echo ""
    echo "========================================="
    echo "  提升完成"
    echo "========================================="
    echo ""
    echo "新主库信息:"
    echo "  容器名: ha-postgres-replica"
    echo "  IP地址: $new_master_ip"
    echo ""
    echo "后续操作:"
    echo ""
    echo "1. 更新应用配置:"
    echo "   - 修改 .env 文件中的 POSTGRES_HOST=$new_master_ip"
    echo "   - 重启应用容器"
    echo ""
    echo "2. 处理原主库:"
    echo "   - 停止原主库容器"
    echo "   - 清理原主库数据"
    echo "   - 将原主库重新配置为从库"
    echo ""
    echo "3. 重新配置复制:"
    echo "   - 从新主库创建基础备份"
    echo "   - 配置新从库连接到新主库"
    echo ""
    echo "4. 更新负载均衡器:"
    echo "   - 修改 Nginx 配置指向新主库"
    echo "   - 重载 Nginx 配置"
    echo ""
    echo "========================================="
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  PostgreSQL 从库提升工具"
    echo "========================================="
    echo ""
    
    # 检查从库状态
    if ! check_replica_status; then
        exit 1
    fi
    
    # 检查复制延迟
    check_replication_lag
    lag_status=$?
    
    if [ "$CHECK_ONLY" = true ]; then
        log_info "仅检查模式，不执行提升"
        exit $lag_status
    fi
    
    # 确认操作
    if [ "$FORCE" = false ]; then
        echo ""
        log_warning "⚠️  此操作将提升从库为主库，原主库将无法自动恢复！"
        echo ""
        read -p "确认要继续吗？(yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "已取消操作"
            exit 0
        fi
    fi
    
    # 执行提升
    backup_config
    
    if promote_replica; then
        update_config
        verify_promotion
        show_next_steps
    else
        log_error "提升失败"
        exit 1
    fi
}

main

