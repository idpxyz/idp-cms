#!/bin/bash

# 主题系统测试脚本
# 使用现有的 Docker Compose 开发环境进行测试

set -e

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

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    if ! docker compose ps | grep -q "Up"; then
        log_error "Docker Compose 服务未运行，请先启动服务"
        exit 1
    fi
    
    log_success "服务状态正常"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    # 检查迁移状态
    docker compose exec -T authoring python manage.py showmigrations core
    
    # 执行迁移
    docker compose exec -T authoring python manage.py migrate core
    
    log_success "数据库迁移完成"
}

# 运行合约测试
run_contract_tests() {
    log_info "运行主题合约测试..."
    
    if docker compose exec -T sites npm run test:contracts; then
        log_success "合约测试通过"
    else
        log_error "合约测试失败"
        return 1
    fi
}

# 运行性能测试
run_performance_tests() {
    log_info "运行性能测试..."
    
    if docker compose exec -T sites npm run test:performance; then
        log_success "性能测试通过"
    else
        log_error "性能测试失败"
        return 1
    fi
}

# 运行 Lighthouse 测试
run_lighthouse_tests() {
    log_info "运行 Lighthouse 测试..."
    
    # 检查 Next.js 服务是否响应
    if ! curl -s http://localhost:3001 > /dev/null; then
        log_error "Next.js 服务未响应"
        return 1
    fi
    
    # 检查各个站点页面
    local sites=("localhost:3001" "localhost:3001/beijing" "localhost:3001/shanghai" "localhost:3001/hangzhou" "localhost:3001/shenzhen")
    
    for site in "${sites[@]}"; do
        log_info "检查站点: $site"
        if curl -s "$site" | grep -q "html"; then
            log_success "站点 $site 响应正常"
        else
            log_warning "站点 $site 响应异常"
        fi
    done
    
    log_success "Lighthouse 基础测试完成"
    log_info "注意: 完整的 Lighthouse 审计可以单独运行"
}

# 运行构建测试
run_build_test() {
    log_info "运行构建测试..."
    
    if docker compose exec -T sites npm run build; then
        log_success "构建测试通过"
    else
        log_error "构建测试失败"
        return 1
    fi
}

# 主测试流程
run_full_test() {
    log_info "开始完整测试流程..."
    
    check_services
    run_migrations
    run_contract_tests
    run_performance_tests
    run_lighthouse_tests
    run_build_test
    
    log_success "所有测试完成！"
}

# 快速测试
run_quick_test() {
    log_info "开始快速测试..."
    
    check_services
    run_contract_tests
    run_build_test
    
    log_success "快速测试完成！"
}

# 脚本入口
case "${1:-full}" in
    "full")
        run_full_test
        ;;
    "quick")
        run_quick_test
        ;;
    "migrations")
        run_migrations
        ;;
    "contracts")
        run_contract_tests
        ;;
    "performance")
        run_performance_tests
        ;;
    "lighthouse")
        run_lighthouse_tests
        ;;
    "build")
        run_build_test
        ;;
    *)
        echo "用法: $0 [full|quick|migrations|contracts|performance|lighthouse|build]"
        echo "  full       - 运行完整测试流程"
        echo "  quick      - 运行快速测试"
        echo "  migrations - 仅运行数据库迁移"
        echo "  contracts  - 仅运行合约测试"
        echo "  performance - 仅运行性能测试"
        echo "  lighthouse - 仅运行 Lighthouse 测试"
        echo "  build      - 仅运行构建测试"
        exit 1
        ;;
esac