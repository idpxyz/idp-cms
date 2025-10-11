#!/bin/bash

# =============================================================================
# Portal 前端清理脚本
# =============================================================================
# 此脚本将清理已弃用的 portal 前端服务
# 执行前请确保：
# 1. 已经停止所有 Docker 服务
# 2. 已经备份重要数据
# 3. 确认 sites 前端正常工作
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

# 确认执行
confirm_cleanup() {
    log_warning "⚠️  此操作将清理已弃用的 portal 前端服务"
    log_warning "包括："
    log_warning "  - 删除 portal/ 目录及其所有内容"
    log_warning "  - 修改 Docker Compose 配置文件"
    log_warning "  - 备份文件将保存到 backup/portal_cleanup_$(date +%Y%m%d)/"
    echo ""
    read -p "确认执行清理？(输入 YES 继续): " confirm
    
    if [ "$confirm" != "YES" ]; then
        log_error "清理已取消"
        exit 1
    fi
}

# 创建备份
create_backup() {
    log_info "📦 创建备份..."
    
    BACKUP_DIR="backup/portal_cleanup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份 portal 目录
    if [ -d "portal" ]; then
        log_info "备份 portal 目录..."
        tar -czf "$BACKUP_DIR/portal_directory.tar.gz" portal/
        log_success "portal 目录已备份到: $BACKUP_DIR/portal_directory.tar.gz"
    fi
    
    # 备份 docker-compose 文件
    log_info "备份 docker-compose 配置文件..."
    cp infra/local/docker-compose.yml "$BACKUP_DIR/docker-compose.yml.backup"
    cp infra/production/docker-compose.yml "$BACKUP_DIR/docker-compose.yml.backup"
    
    log_success "✅ 备份完成: $BACKUP_DIR"
}

# 停止服务
stop_services() {
    log_info "🛑 停止所有服务..."
    
    docker compose -f infra/local/docker-compose.yml down 2>/dev/null || log_warning "开发环境服务未运行"
    docker compose -f infra/production/docker-compose.yml down 2>/dev/null || log_warning "生产环境服务未运行"
    
    log_success "✅ 服务已停止"
}

# 清理 Docker Compose 配置
cleanup_docker_compose() {
    log_info "🔧 清理 Docker Compose 配置..."
    
    # 开发环境 - 删除 portal 服务块
    log_info "处理开发环境配置..."
    python3 << 'EOF'
import re

# 读取文件
with open('infra/local/docker-compose.yml', 'r') as f:
    content = f.read()

# 删除 portal 服务块（第 208-236 行附近）
# 查找并删除整个 portal 服务定义
pattern = r'\n  portal:.*?(?=\n  [a-z_-]+:|$)'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 清理 portal.local 从 ALLOWED_HOSTS
content = content.replace('portal.local,', '')
content = content.replace(',portal.local', '')

# 写回文件
with open('infra/local/docker-compose.yml', 'w') as f:
    f.write(content)

print("✅ 开发环境配置已更新")
EOF
    
    # 生产环境 - 删除 portal 服务块
    log_info "处理生产环境配置..."
    python3 << 'EOF'
import re

# 读取文件
with open('infra/production/docker-compose.yml', 'r') as f:
    content = f.read()

# 删除 portal 服务块
pattern = r'\n  portal:.*?(?=\n  [a-z_-]+:|$)'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 写回文件
with open('infra/production/docker-compose.yml', 'w') as f:
    f.write(content)

print("✅ 生产环境配置已更新")
EOF
    
    log_success "✅ Docker Compose 配置已清理"
}

# 删除 portal 目录
delete_portal_directory() {
    log_info "🗑️  删除 portal 目录..."
    
    if [ -d "portal" ]; then
        # 尝试普通删除
        if rm -rf portal/ 2>/dev/null; then
            log_success "✅ portal 目录已删除"
        else
            # 如果权限不足，使用 sudo
            log_warning "需要管理员权限删除 Docker 创建的文件..."
            sudo rm -rf portal/
            log_success "✅ portal 目录已删除（使用 sudo）"
        fi
    else
        log_warning "portal 目录不存在，跳过"
    fi
}

# 验证清理结果
verify_cleanup() {
    log_info "🔍 验证清理结果..."
    
    # 检查 portal 目录是否已删除
    if [ -d "portal" ]; then
        log_error "❌ portal 目录仍然存在"
        exit 1
    else
        log_success "✅ portal 目录已成功删除"
    fi
    
    # 检查 docker-compose 文件中是否还有 portal 引用
    if grep -q "portal:" infra/local/docker-compose.yml; then
        log_warning "⚠️  开发环境配置中仍有 portal 服务引用"
    else
        log_success "✅ 开发环境配置已清理干净"
    fi
    
    if grep -q "portal:" infra/production/docker-compose.yml; then
        log_warning "⚠️  生产环境配置中仍有 portal 服务引用"
    else
        log_success "✅ 生产环境配置已清理干净"
    fi
}

# 重启服务
restart_services() {
    log_info "🚀 重启开发环境服务..."
    
    read -p "是否立即重启开发环境服务？(y/n): " restart
    
    if [ "$restart" = "y" ] || [ "$restart" = "Y" ]; then
        ./start.sh
        log_success "✅ 服务已重启"
    else
        log_info "跳过服务重启，稍后可手动执行: ./start.sh"
    fi
}

# 显示清理总结
show_summary() {
    echo ""
    echo "=========================================="
    log_success "🎉 Portal 清理完成！"
    echo "=========================================="
    echo ""
    log_info "📋 清理内容："
    echo "  ✅ portal/ 目录已删除"
    echo "  ✅ Docker Compose 配置已更新"
    echo "  ✅ 备份已保存"
    echo ""
    log_info "🔗 当前前端服务："
    echo "  ✅ sites (端口 3001) - http://localhost:3001/"
    echo ""
    log_info "📚 后续步骤："
    echo "  1. 更新项目文档，移除 portal 引用"
    echo "  2. 搜索代码中的 localhost:3000 引用"
    echo "  3. 测试 sites 前端功能"
    echo ""
    log_info "📦 备份位置："
    echo "  ${BACKUP_DIR}"
    echo ""
}

# 主函数
main() {
    log_info "🗑️  Portal 前端清理脚本"
    echo ""
    
    # 1. 确认执行
    confirm_cleanup
    
    # 2. 创建备份
    create_backup
    
    # 3. 停止服务
    stop_services
    
    # 4. 清理 Docker Compose 配置
    cleanup_docker_compose
    
    # 5. 删除 portal 目录
    delete_portal_directory
    
    # 6. 验证清理结果
    verify_cleanup
    
    # 7. 重启服务
    restart_services
    
    # 8. 显示总结
    show_summary
}

# 执行主函数
main

