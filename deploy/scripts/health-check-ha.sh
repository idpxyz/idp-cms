#!/bin/bash
# =============================================================================
# 高可用健康检查脚本
# =============================================================================
# 用途: 检查整个高可用系统的健康状态
# 包括: 应用服务、数据库复制、Redis、MinIO、网络连通性
# 
# 使用方法:
#   ./health-check-ha.sh [--verbose] [--json]
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERBOSE=false
JSON_OUTPUT=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose) VERBOSE=true; shift ;;
        --json) JSON_OUTPUT=true; shift ;;
        *) shift ;;
    esac
done

log_info() { [ "$JSON_OUTPUT" = false ] && echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { [ "$JSON_OUTPUT" = false ] && echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { [ "$JSON_OUTPUT" = false ] && echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { [ "$JSON_OUTPUT" = false ] && echo -e "${RED}[✗]${NC} $1"; }

# 健康状态
declare -A health_status
health_status[overall]="healthy"

# 检查 PostgreSQL 主库
check_postgres_master() {
    log_info "检查 PostgreSQL 主库..."
    
    if docker exec ha-postgres-master pg_isready -U news &> /dev/null; then
        log_success "PostgreSQL 主库正常"
        health_status[postgres_master]="healthy"
    else
        log_error "PostgreSQL 主库异常"
        health_status[postgres_master]="unhealthy"
        health_status[overall]="unhealthy"
    fi
    
    # 检查复制状态
    if [ "$VERBOSE" = true ]; then
        docker exec ha-postgres-master psql -U news -d news_ha -c \
            "SELECT application_name, state, sync_state, replay_lag FROM pg_stat_replication;" 2>/dev/null || true
    fi
}

# 检查 PostgreSQL 从库
check_postgres_replica() {
    log_info "检查 PostgreSQL 从库..."
    
    # 注意：如果从库在另一台服务器上，此检查可能失败
    if docker ps | grep -q "ha-postgres-replica"; then
        if docker exec ha-postgres-replica pg_isready -U news &> /dev/null; then
            log_success "PostgreSQL 从库正常"
            health_status[postgres_replica]="healthy"
            
            # 检查复制延迟
            if [ "$VERBOSE" = true ]; then
                docker exec ha-postgres-replica psql -U news -d news_ha -c \
                    "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;" 2>/dev/null || true
            fi
        else
            log_error "PostgreSQL 从库异常"
            health_status[postgres_replica]="unhealthy"
        fi
    else
        log_warning "PostgreSQL 从库未在本机运行"
        health_status[postgres_replica]="not_local"
    fi
}

# 检查 Redis 主从
check_redis() {
    log_info "检查 Redis 集群..."
    
    # 检查主节点
    if docker ps | grep -q "redis-master"; then
        if docker exec node1-redis-master redis-cli -a ${REDIS_PASSWORD:-SecureRedisPass123!} ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis 主节点正常"
            health_status[redis_master]="healthy"
        else
            log_error "Redis 主节点异常"
            health_status[redis_master]="unhealthy"
            health_status[overall]="degraded"
        fi
    fi
    
    # 检查从节点
    if docker ps | grep -q "redis-replica"; then
        if docker exec node2-redis-replica redis-cli -a ${REDIS_PASSWORD:-SecureRedisPass123!} ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis 从节点正常"
            health_status[redis_replica]="healthy"
        else
            log_error "Redis 从节点异常"
            health_status[redis_replica]="unhealthy"
        fi
    fi
}

# 检查 Redis Sentinel
check_sentinel() {
    log_info "检查 Redis Sentinel..."
    
    local sentinel_count=0
    local healthy_sentinel=0
    
    for container in $(docker ps --filter "label=role=sentinel" --format "{{.Names}}"); do
        sentinel_count=$((sentinel_count + 1))
        if docker exec $container redis-cli -p 26379 ping 2>/dev/null | grep -q "PONG"; then
            healthy_sentinel=$((healthy_sentinel + 1))
            log_success "Sentinel $container 正常"
        else
            log_error "Sentinel $container 异常"
        fi
    done
    
    if [ $healthy_sentinel -ge 2 ]; then
        health_status[sentinel]="healthy"
        log_success "Sentinel 集群正常 ($healthy_sentinel/$sentinel_count)"
    else
        health_status[sentinel]="unhealthy"
        health_status[overall]="degraded"
        log_warning "Sentinel 集群降级 ($healthy_sentinel/$sentinel_count)"
    fi
}

# 检查应用服务
check_applications() {
    log_info "检查应用服务..."
    
    # 检查节点1
    if docker ps | grep -q "node1-authoring"; then
        if curl -sf http://localhost:8000/health/readiness/ > /dev/null; then
            log_success "节点1 Django 正常"
            health_status[node1_backend]="healthy"
        else
            log_error "节点1 Django 异常"
            health_status[node1_backend]="unhealthy"
            health_status[overall]="degraded"
        fi
        
        if curl -sf http://localhost:3000/api/health > /dev/null; then
            log_success "节点1 Next.js 正常"
            health_status[node1_frontend]="healthy"
        else
            log_error "节点1 Next.js 异常"
            health_status[node1_frontend]="unhealthy"
            health_status[overall]="degraded"
        fi
    fi
    
    # 检查节点2（如果在同一台机器上）
    if docker ps | grep -q "node2-authoring"; then
        if curl -sf http://localhost:8001/health/readiness/ > /dev/null 2>&1; then
            log_success "节点2 Django 正常"
            health_status[node2_backend]="healthy"
        else
            log_warning "节点2 Django 可能在其他服务器上"
            health_status[node2_backend]="not_local"
        fi
    fi
}

# 检查 MinIO
check_minio() {
    log_info "检查 MinIO 集群..."
    
    local minio_count=0
    local healthy_minio=0
    
    for container in $(docker ps --filter "label=role=storage" --format "{{.Names}}"); do
        minio_count=$((minio_count + 1))
        if docker exec $container curl -sf http://localhost:9000/minio/health/live > /dev/null; then
            healthy_minio=$((healthy_minio + 1))
            log_success "MinIO $container 正常"
        else
            log_error "MinIO $container 异常"
        fi
    done
    
    if [ $healthy_minio -ge 2 ]; then
        health_status[minio]="healthy"
        log_success "MinIO 集群正常 ($healthy_minio/$minio_count)"
    else
        health_status[minio]="degraded"
        health_status[overall]="degraded"
        log_warning "MinIO 集群降级 ($healthy_minio/$minio_count)"
    fi
}

# 检查 OpenSearch
check_opensearch() {
    log_info "检查 OpenSearch..."
    
    if docker ps | grep -q "opensearch"; then
        for container in $(docker ps --filter "label=role=search" --format "{{.Names}}"); do
            if docker exec $container curl -sf -k -u admin:${OPENSEARCH_PASSWORD:-OpenSearchPass123!} \
                https://localhost:9200/_cluster/health > /dev/null; then
                log_success "OpenSearch $container 正常"
                health_status[opensearch]="healthy"
            else
                log_error "OpenSearch $container 异常"
                health_status[opensearch]="unhealthy"
            fi
        done
    fi
}

# 检查 ClickHouse
check_clickhouse() {
    log_info "检查 ClickHouse..."
    
    if docker ps | grep -q "clickhouse"; then
        if docker exec ha-clickhouse clickhouse-client --query "SELECT 1" &> /dev/null; then
            log_success "ClickHouse 正常"
            health_status[clickhouse]="healthy"
        else
            log_error "ClickHouse 异常"
            health_status[clickhouse]="unhealthy"
        fi
    fi
}

# 检查网络连通性
check_network() {
    log_info "检查 Docker 网络..."
    
    if docker network inspect idp-ha-network &> /dev/null; then
        log_success "Docker 网络正常"
        health_status[network]="healthy"
    else
        log_error "Docker 网络异常"
        health_status[network]="unhealthy"
        health_status[overall]="unhealthy"
    fi
}

# 生成 JSON 报告
generate_json_report() {
    echo "{"
    echo '  "timestamp": "'$(date -Iseconds)'",'
    echo '  "overall_status": "'${health_status[overall]}'",'
    echo '  "components": {'
    
    local first=true
    for key in "${!health_status[@]}"; do
        [ "$key" = "overall" ] && continue
        [ "$first" = false ] && echo ","
        echo -n '    "'$key'": "'${health_status[$key]}'"'
        first=false
    done
    
    echo ""
    echo "  }"
    echo "}"
}

# 生成文本报告
generate_text_report() {
    echo ""
    echo "========================================="
    echo "  高可用系统健康检查报告"
    echo "========================================="
    echo ""
    echo "检查时间: $(date)"
    echo "总体状态: ${health_status[overall]}"
    echo ""
    echo "组件状态:"
    echo "----------------------------------------"
    
    for key in "${!health_status[@]}"; do
        [ "$key" = "overall" ] && continue
        printf "  %-20s : %s\n" "$key" "${health_status[$key]}"
    done
    
    echo ""
    echo "========================================="
    
    # 根据状态返回退出码
    case ${health_status[overall]} in
        "healthy") exit 0 ;;
        "degraded") exit 1 ;;
        "unhealthy") exit 2 ;;
        *) exit 3 ;;
    esac
}

# 主函数
main() {
    [ "$JSON_OUTPUT" = false ] && echo "" && echo "开始健康检查..." && echo ""
    
    check_network
    check_postgres_master
    check_postgres_replica
    check_redis
    check_sentinel
    check_applications
    check_minio
    check_opensearch
    check_clickhouse
    
    if [ "$JSON_OUTPUT" = true ]; then
        generate_json_report
    else
        generate_text_report
    fi
}

main

