#!/bin/bash
# =============================================================================
# 服务器1（主节点）部署脚本
# =============================================================================
# 用途: 在服务器1上部署应用服务
# 包括: Django、Next.js、Redis主节点、OpenSearch
# 
# 前置条件:
#   - 共享基础设施已部署
#   - Docker 网络已创建
#   - 环境变量已配置
# 
# 使用方法:
#   ./deploy-ha-node1.sh [--rebuild]
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
    
    # 检查网络
    if ! docker network inspect idp-ha-network &> /dev/null; then
        log_error "Docker 网络 idp-ha-network 不存在"
        log_info "请先运行: ./deploy-ha-infrastructure.sh"
        exit 1
    fi
    
    # 检查环境变量
    if [ ! -f ".env.node1" ]; then
        log_error "环境变量文件 .env.node1 不存在"
        exit 1
    fi
    
    # 检查共享服务
    if ! docker ps | grep -q "ha-postgres-master"; then
        log_error "PostgreSQL 主库未运行"
        log_info "请先运行: ./deploy-ha-infrastructure.sh"
        exit 1
    fi
    
    log_success "前置条件检查通过"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    cd /opt/idp-cms
    
    if [ "$1" = "--rebuild" ]; then
        log_info "强制重新构建..."
        docker compose -f infra/production/docker-compose-ha-node1.yml build --no-cache
    else
        docker compose -f infra/production/docker-compose-ha-node1.yml build
    fi
    
    log_success "镜像构建完成"
}

# 部署应用
deploy_application() {
    log_info "部署应用服务..."
    
    cd /opt/idp-cms
    
    # 启动服务
    docker compose -f infra/production/docker-compose-ha-node1.yml up -d
    
    log_success "应用部署完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 等待应用启动
    sleep 10
    
    # 运行迁移
    log_info "运行数据库迁移..."
    docker exec node1-authoring python manage.py migrate --noinput
    
    # 收集静态文件
    log_info "收集静态文件..."
    docker exec node1-authoring python manage.py collectstatic --noinput
    
    # 创建超级用户（可选）
    read -p "是否创建超级用户？(y/n): " create_superuser
    if [ "$create_superuser" = "y" ]; then
        docker exec -it node1-authoring python manage.py createsuperuser
    fi
    
    log_success "数据库初始化完成"
}

# 配置 Redis 主节点
configure_redis_master() {
    log_info "配置 Redis 主节点..."
    
    source .env.node1
    
    # 验证 Redis 连接
    docker exec node1-redis-master redis-cli \
        -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
        ping || log_error "Redis 连接失败"
    
    # 设置为主节点
    docker exec node1-redis-master redis-cli \
        -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
        info replication
    
    log_success "Redis 配置完成"
}

# 初始化 OpenSearch
init_opensearch() {
    log_info "初始化 OpenSearch..."
    
    source .env.node1
    
    # 等待 OpenSearch 就绪
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec node1-opensearch curl -k -u admin:${OPENSEARCH_PASSWORD:-OpenSearchPass123!} \
            https://localhost:9200/_cluster/health &> /dev/null; then
            log_success "OpenSearch 已就绪"
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    # 创建索引（如果需要）
    log_info "创建索引模板..."
    docker exec node1-authoring python manage.py search_index --rebuild -f || log_warning "索引创建可能失败"
    
    log_success "OpenSearch 初始化完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    echo ""
    echo "=== 服务状态 ==="
    docker compose -f infra/production/docker-compose-ha-node1.yml ps
    
    echo ""
    echo "=== 后端健康检查 ==="
    curl -f http://localhost:8000/health/readiness/ || log_error "后端健康检查失败"
    
    echo ""
    echo "=== 前端健康检查 ==="
    curl -f http://localhost:3000/api/health || log_error "前端健康检查失败"
    
    echo ""
    echo "=== Redis 状态 ==="
    source .env.node1
    docker exec node1-redis-master redis-cli \
        -a ${REDIS_PASSWORD:-SecureRedisPass123!} \
        info replication
    
    log_success "健康检查完成"
}

# 显示部署信息
show_info() {
    echo ""
    echo "========================================="
    echo "  服务器1（主节点）部署完成"
    echo "========================================="
    echo ""
    echo "服务访问地址："
    echo "- Django 后端: http://localhost:8000"
    echo "- Next.js 前端: http://localhost:3000"
    echo "- Django Admin: http://localhost:8000/admin/"
    echo "- OpenSearch: https://localhost:9200"
    echo ""
    echo "下一步操作："
    echo "1. 在服务器2部署从节点:"
    echo "   ./deploy/scripts/deploy-ha-node2.sh"
    echo ""
    echo "2. 配置 Nginx 负载均衡"
    echo ""
    echo "3. 配置 SSL 证书"
    echo ""
    echo "查看日志："
    echo "  docker compose -f infra/production/docker-compose-ha-node1.yml logs -f"
    echo ""
    echo "========================================="
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  部署服务器1（主节点）"
    echo "========================================="
    echo ""
    
    check_prerequisites
    build_images "$1"
    deploy_application
    sleep 15  # 等待服务启动
    init_database
    configure_redis_master
    init_opensearch
    health_check
    show_info
}

main "$@"

