#!/bin/bash
# =============================================================================
# 服务器2（从节点）部署脚本
# =============================================================================
# 用途: 在服务器2上部署应用服务
# 包括: Django、Next.js、Redis从节点、OpenSearch、MinIO节点
# 
# 前置条件:
#   - 服务器1已部署并运行正常
#   - 共享基础设施可访问
#   - 环境变量已配置
# 
# 使用方法:
#   ./deploy-ha-node2.sh [--init-replica]
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

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."
    
    # 检查环境变量
    if [ ! -f ".env.node2" ]; then
        log_error "环境变量文件 .env.node2 不存在"
        exit 1
    fi
    
    # 检查服务器1连接
    source .env.node2
    if ! ping -c 1 ${SERVER1_IP} &> /dev/null; then
        log_warning "无法 ping 通服务器1 (${SERVER1_IP})"
        read -p "是否继续？(y/n): " continue
        [ "$continue" != "y" ] && exit 1
    fi
    
    log_success "前置条件检查通过"
}

# 初始化 PostgreSQL 从库
init_postgres_replica() {
    log_info "初始化 PostgreSQL 从库..."
    
    source .env.node2
    
    # 检查是否需要初始化
    if docker volume inspect ha-postgres-replica-data &> /dev/null; then
        log_warning "从库数据卷已存在"
        read -p "是否重新初始化？这将删除所有数据！(yes/no): " confirm
        [ "$confirm" != "yes" ] && return 0
        
        docker volume rm ha-postgres-replica-data || true
    fi
    
    # 创建数据卷
    docker volume create ha-postgres-replica-data
    
    # 使用 pg_basebackup 创建基础备份
    log_info "从主库创建基础备份（这可能需要几分钟）..."
    docker run --rm \
        --network idp-ha-network \
        -v ha-postgres-replica-data:/var/lib/postgresql/data \
        -e PGPASSWORD=${REPLICATION_PASSWORD:-ReplicationPass123!} \
        postgres:15-alpine \
        pg_basebackup \
            -h ${SERVER1_IP} \
            -U replication \
            -D /var/lib/postgresql/data \
            -Fp -Xs -P -R
    
    log_success "PostgreSQL 从库初始化完成"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    cd /opt/idp-cms
    docker compose -f infra/production/docker-compose-ha-node2.yml build
    
    log_success "镜像构建完成"
}

# 部署应用
deploy_application() {
    log_info "部署应用服务..."
    
    cd /opt/idp-cms
    docker compose -f infra/production/docker-compose-ha-node2.yml up -d
    
    log_success "应用部署完成"
}

# 配置 Redis 从节点
configure_redis_replica() {
    log_info "配置 Redis 从节点..."
    
    source .env.node2
    
    # 等待 Redis 启动
    sleep 5
    
    # 验证复制状态
    docker exec node2-redis-replica redis-cli \
        -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
        info replication || log_error "Redis 连接失败"
    
    log_success "Redis 从节点配置完成"
}

# 配置 Sentinel
configure_sentinel() {
    log_info "配置 Redis Sentinel..."
    
    # 验证 Sentinel 状态
    docker exec node2-redis-sentinel-2 redis-cli \
        -p 26379 \
        sentinel masters || log_error "Sentinel 连接失败"
    
    log_success "Sentinel 配置完成"
}

# 验证 PostgreSQL 复制
verify_postgres_replication() {
    log_info "验证 PostgreSQL 复制状态..."
    
    # 在主库检查复制状态
    source .env.node2
    ssh ${SERVER1_IP} "docker exec ha-postgres-master psql -U news -d news_ha -c \
        'SELECT application_name, state, sync_state FROM pg_stat_replication;'" || \
        log_warning "无法检查主库复制状态（需要 SSH 访问）"
    
    log_success "PostgreSQL 复制验证完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    echo ""
    echo "=== 服务状态 ==="
    docker compose -f infra/production/docker-compose-ha-node2.yml ps
    
    echo ""
    echo "=== 后端健康检查 ==="
    curl -f http://localhost:8000/health/readiness/ || log_error "后端健康检查失败"
    
    echo ""
    echo "=== 前端健康检查 ==="
    curl -f http://localhost:3000/api/health || log_error "前端健康检查失败"
    
    echo ""
    echo "=== Redis 复制状态 ==="
    source .env.node2
    docker exec node2-redis-replica redis-cli \
        -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
        info replication
    
    echo ""
    echo "=== Sentinel 状态 ==="
    docker exec node2-redis-sentinel-2 redis-cli \
        -p 26379 \
        sentinel masters
    
    log_success "健康检查完成"
}

# 显示部署信息
show_info() {
    echo ""
    echo "========================================="
    echo "  服务器2（从节点）部署完成"
    echo "========================================="
    echo ""
    echo "服务访问地址："
    echo "- Django 后端: http://localhost:8000"
    echo "- Next.js 前端: http://localhost:3000"
    echo "- OpenSearch: https://localhost:9200"
    echo "- MinIO: http://localhost:9002"
    echo ""
    echo "下一步操作："
    echo "1. 配置 Nginx 负载均衡器"
    echo "2. 测试故障转移"
    echo "3. 配置监控和告警"
    echo ""
    echo "验证复制状态："
    echo "  ./deploy/scripts/health-check-ha.sh"
    echo ""
    echo "查看日志："
    echo "  docker compose -f infra/production/docker-compose-ha-node2.yml logs -f"
    echo ""
    echo "========================================="
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  部署服务器2（从节点）"
    echo "========================================="
    echo ""
    
    check_prerequisites
    
    if [ "$1" = "--init-replica" ]; then
        init_postgres_replica
    fi
    
    build_images
    deploy_application
    sleep 15  # 等待服务启动
    configure_redis_replica
    configure_sentinel
    verify_postgres_replication
    health_check
    show_info
}

main "$@"

