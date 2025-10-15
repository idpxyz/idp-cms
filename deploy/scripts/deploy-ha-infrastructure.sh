#!/bin/bash
# =============================================================================
# 高可用基础设施部署脚本
# =============================================================================
# 用途: 在服务器1上部署共享基础设施
# 包括: PostgreSQL主库、MinIO分布式存储、ClickHouse、Redis Sentinel
# 
# 使用方法:
#   ./deploy-ha-infrastructure.sh [--clean]
# 
# 选项:
#   --clean  清理现有数据重新部署（危险操作！）
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 或有 sudo 权限
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "以 root 用户运行"
    elif ! sudo -n true 2>/dev/null; then
        log_error "需要 sudo 权限"
        exit 1
    fi
}

# 检查 Docker 和 Docker Compose
check_docker() {
    log_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    log_info "检查环境变量文件..."
    
    if [ ! -f ".env.node1" ]; then
        log_warning ".env.node1 不存在，从示例文件创建..."
        if [ -f ".env.production.ha.example" ]; then
            cp .env.production.ha.example .env.node1
            log_info "请编辑 .env.node1 配置文件"
            read -p "按 Enter 继续..."
        else
            log_error "找不到环境变量示例文件"
            exit 1
        fi
    fi
    
    log_success "环境变量文件检查通过"
}

# 创建 Docker 网络
create_network() {
    log_info "创建 Docker 网络..."
    
    if docker network inspect idp-ha-network &> /dev/null; then
        log_warning "网络 idp-ha-network 已存在"
    else
        docker network create idp-ha-network \
            --driver bridge \
            --subnet 172.28.0.0/16 \
            --gateway 172.28.0.1 \
            --opt com.docker.network.bridge.name=br-idp-ha
        log_success "网络创建成功"
    fi
}

# 部署共享基础设施
deploy_infrastructure() {
    log_info "部署共享基础设施..."
    
    cd /opt/idp-cms
    
    # 拉取镜像
    log_info "拉取 Docker 镜像..."
    docker compose -f infra/shared/docker-compose-ha.yml pull
    
    # 启动服务
    log_info "启动服务..."
    docker compose -f infra/shared/docker-compose-ha.yml up -d
    
    log_success "基础设施部署完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f infra/shared/docker-compose-ha.yml ps | grep -q "healthy"; then
            log_success "服务已就绪"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    log_error "服务启动超时"
    return 1
}

# 初始化 PostgreSQL 复制
init_postgres_replication() {
    log_info "初始化 PostgreSQL 复制..."
    
    # 加载环境变量
    source .env.node1
    
    # 创建复制用户
    log_info "创建复制用户..."
    docker exec ha-postgres-master psql -U ${POSTGRES_USER:-news} -d ${POSTGRES_DB:-news_ha} -c \
        "DO \$\$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'replication') THEN
                CREATE USER replication WITH REPLICATION PASSWORD '${REPLICATION_PASSWORD:-ReplicationPass123!}';
            END IF;
        END \$\$;" || log_warning "复制用户可能已存在"
    
    # 创建复制槽
    log_info "创建复制槽..."
    docker exec ha-postgres-master psql -U ${POSTGRES_USER:-news} -d ${POSTGRES_DB:-news_ha} -c \
        "SELECT * FROM pg_create_physical_replication_slot('replica1_slot');" || log_warning "复制槽可能已存在"
    
    log_success "PostgreSQL 复制初始化完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    echo ""
    echo "=== 服务状态 ==="
    docker compose -f infra/shared/docker-compose-ha.yml ps
    
    echo ""
    echo "=== PostgreSQL 状态 ==="
    docker exec ha-postgres-master psql -U news -d news_ha -c "SELECT version();" || log_error "PostgreSQL 连接失败"
    
    echo ""
    echo "=== Redis Sentinel 状态 ==="
    docker exec ha-redis-sentinel-1 redis-cli -p 26379 ping || log_error "Redis Sentinel 连接失败"
    
    echo ""
    echo "=== MinIO 状态 ==="
    docker exec ha-minio1 mc admin info local || log_warning "MinIO 状态检查失败"
    
    echo ""
    echo "=== ClickHouse 状态 ==="
    docker exec ha-clickhouse clickhouse-client --query "SELECT version()" || log_error "ClickHouse 连接失败"
    
    log_success "验证完成"
}

# 清理现有部署
clean_deployment() {
    log_warning "清理现有部署..."
    read -p "确认要删除所有数据吗？(yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "取消清理操作"
        return 0
    fi
    
    log_info "停止服务..."
    docker compose -f infra/shared/docker-compose-ha.yml down -v
    
    log_info "删除网络..."
    docker network rm idp-ha-network || true
    
    log_success "清理完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "========================================="
    echo "  高可用基础设施部署完成"
    echo "========================================="
    echo ""
    echo "下一步操作："
    echo "1. 在服务器1部署应用:"
    echo "   ./deploy/scripts/deploy-ha-node1.sh"
    echo ""
    echo "2. 在服务器2部署应用:"
    echo "   ./deploy/scripts/deploy-ha-node2.sh"
    echo ""
    echo "3. 配置负载均衡器 (Nginx)"
    echo ""
    echo "访问信息："
    echo "- PostgreSQL: localhost:5432"
    echo "- Redis Sentinel: localhost:26379"
    echo "- MinIO Console: http://localhost:9001"
    echo "- ClickHouse: http://localhost:8123"
    echo ""
    echo "========================================="
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  IDP-CMS 高可用基础设施部署"
    echo "========================================="
    echo ""
    
    # 检查参数
    if [ "$1" = "--clean" ]; then
        clean_deployment
        exit 0
    fi
    
    # 执行部署步骤
    check_permissions
    check_docker
    check_env_file
    create_network
    deploy_infrastructure
    wait_for_services
    init_postgres_replication
    verify_deployment
    show_deployment_info
}

# 运行主函数
main "$@"

