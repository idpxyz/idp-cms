#!/bin/bash

# =============================================================================
# IDP-CMS 生产环境部署脚本
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
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

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装"
        exit 1
    fi
}

check_file() {
    if [ ! -f "$1" ]; then
        log_error "文件 $1 不存在"
        exit 1
    fi
}

# 主函数
main() {
    log_info "开始生产环境部署..."
    
    # 1. 环境检查
    log_info "检查部署环境..."
    check_command docker
    check_command docker-compose
    
    # 2. 配置文件检查
    log_info "检查配置文件..."
    check_file .env
    check_file infra/production/docker-compose.yaml
    
    # 3. 安全配置验证
    log_info "验证安全配置..."
    validate_security_config
    
    # 4. 数据库备份（如果存在）
    log_info "检查数据库备份..."
    backup_database
    
    # 5. 停止现有服务
    log_info "停止现有服务..."
    stop_services
    
    # 6. 拉取最新代码
    log_info "拉取最新代码..."
    pull_latest_code
    
    # 7. 构建和启动服务
    log_info "构建和启动服务..."
    deploy_services
    
    # 8. 健康检查
    log_info "执行健康检查..."
    health_check
    
    # 9. 部署完成
    log_success "生产环境部署完成！"
}

# 安全配置验证
validate_security_config() {
    log_info "验证安全配置..."
    
    # 检查必要的环境变量
    required_vars=(
        "DJANGO_SECRET_KEY"
        "DJANGO_ALLOWED_HOSTS"
        "POSTGRES_PASSWORD"
        "OPENSEARCH_PASSWORD"
        "CORS_ALLOWED_ORIGINS"
        "CSRF_TRUSTED_ORIGINS"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "环境变量 $var 未设置"
            exit 1
        fi
    done
    
    # 检查密钥强度
    if [ ${#DJANGO_SECRET_KEY} -lt 50 ]; then
        log_warning "DJANGO_SECRET_KEY 长度不足，建议至少50个字符"
    fi
    
    # 检查密码强度
    if [ ${#POSTGRES_PASSWORD} -lt 12 ]; then
        log_warning "POSTGRES_PASSWORD 长度不足，建议至少12个字符"
    fi
    
    # 检查CORS配置
    if [[ "$CORS_ALLOWED_ORIGINS" == *"*"* ]]; then
        log_error "生产环境不允许使用通配符 CORS 配置"
        exit 1
    fi
    
    log_success "安全配置验证通过"
}

# 数据库备份
backup_database() {
    if [ -f "infra/production/docker-compose.yaml" ]; then
        log_info "创建数据库备份..."
        
        # 创建备份目录
        mkdir -p backups/$(date +%Y%m%d_%H%M%S)
        
        # 备份PostgreSQL
        docker-compose -f infra/production/docker-compose.yaml exec -T postgres \
            pg_dump -U $POSTGRES_USER $POSTGRES_DB > \
            backups/$(date +%Y%m%d_%H%M%S)/postgres_backup.sql
        
        # 备份MinIO数据
        docker-compose -f infra/production/docker-compose.yaml exec -T minio \
            mc mirror /data backups/$(date +%Y%m%d_%H%M%S)/minio_backup/
        
        log_success "数据库备份完成"
    fi
}

# 停止服务
stop_services() {
    log_info "停止现有服务..."
    
    if [ -f "infra/production/docker-compose.yaml" ]; then
        docker-compose -f infra/production/docker-compose.yaml down --remove-orphans
    fi
    
    log_success "服务已停止"
}

# 拉取最新代码
pull_latest_code() {
    log_info "拉取最新代码..."
    
    if [ -d ".git" ]; then
        git pull origin main
        log_success "代码已更新"
    else
        log_warning "未检测到Git仓库，跳过代码更新"
    fi
}

# 部署服务
deploy_services() {
    log_info "部署服务..."
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose -f infra/production/docker-compose.yaml build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f infra/production/docker-compose.yaml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查PostgreSQL
    if docker-compose -f infra/production/docker-compose.yaml exec -T postgres pg_isready -U $POSTGRES_USER; then
        log_success "PostgreSQL 健康检查通过"
    else
        log_error "PostgreSQL 健康检查失败"
        exit 1
    fi
    
    # 检查Redis
    if docker-compose -f infra/production/docker-compose.yaml exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis 健康检查通过"
    else
        log_error "Redis 健康检查失败"
        exit 1
    fi
    
    # 检查OpenSearch
    if curl -s "http://localhost:9200/_cluster/health" | grep -q "green\|yellow"; then
        log_success "OpenSearch 健康检查通过"
    else
        log_error "OpenSearch 健康检查失败"
        exit 1
    fi
    
    # 检查Django应用
    if curl -s "http://localhost:8000/health/" | grep -q "ok"; then
        log_success "Django 应用健康检查通过"
    else
        log_error "Django 应用健康检查失败"
        exit 1
    fi
    
    log_success "所有服务健康检查通过"
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    # 清理Docker缓存
    docker system prune -f
    log_success "清理完成"
}

# 错误处理
trap 'log_error "部署过程中发生错误，正在清理..."; cleanup; exit 1' ERR

# 脚本入口
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  --help, -h    显示帮助信息"
    echo "  --validate    仅验证配置，不部署"
    echo "  --backup      仅执行备份，不部署"
    exit 0
fi

if [ "$1" == "--validate" ]; then
    log_info "仅执行配置验证..."
    validate_security_config
    log_success "配置验证完成"
    exit 0
fi

if [ "$1" == "--backup" ]; then
    log_info "仅执行数据库备份..."
    backup_database
    log_success "备份完成"
    exit 0
fi

# 执行主函数
main

# 清理
cleanup

log_success "部署脚本执行完成！"
