#!/bin/bash

# =============================================================================
# 快速修复 Portal 端口引用脚本
# =============================================================================
# 此脚本将自动更新代码中从 localhost:3000 到 localhost:3001 的引用
# 仅更新高优先级文件（用户界面、测试脚本等）
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

# 检查文件是否存在
check_file() {
    local file=$1
    if [ ! -f "$file" ]; then
        log_warning "文件不存在，跳过: $file"
        return 1
    fi
    return 0
}

# 备份文件
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "$file.port-backup"
        log_info "已备份: $file.port-backup"
    fi
}

# 更新文件
update_file() {
    local file=$1
    local description=$2
    local pattern=$3
    local replacement=$4
    
    if ! check_file "$file"; then
        return
    fi
    
    # 检查文件是否包含要替换的内容
    if ! grep -q "$pattern" "$file" 2>/dev/null; then
        log_info "文件中未找到引用，跳过: $file"
        return
    fi
    
    backup_file "$file"
    
    # 执行替换
    sed -i "s|$pattern|$replacement|g" "$file"
    
    log_success "✅ 已更新: $file - $description"
}

# 显示即将修改的文件
show_files_to_update() {
    echo ""
    echo "=========================================="
    log_info "📋 即将更新以下文件："
    echo "=========================================="
    echo ""
    echo "🔴 高优先级文件:"
    echo "  1. start-production.sh - 启动脚本输出"
    echo "  2. test-article-performance.sh - 测试脚本 URL"
    echo "  3. generate_test_data.py - 提示信息"
    echo "  4. show_device_fingerprints.py - 示例命令"
    echo "  5. infra/local/start_sites.sh - 启动脚本输出"
    echo "  6. sites/scripts/lighthouse-ci.js - 测试 URL"
    echo ""
    echo "🟡 中优先级文件:"
    echo "  7. .env.core - 环境变量配置"
    echo "  8. apps/api/middleware/cors.py - CORS 配置"
    echo "  9. apps/core/url_config.py - URL 配置"
    echo " 10. apps/core/site_utils.py - 站点工具"
    echo " 11. apps/news/management/commands/init_topic_data.py - 数据初始化"
    echo ""
    log_warning "⚠️  所有文件都会自动备份（.port-backup 后缀）"
    echo ""
}

# 确认执行
confirm_update() {
    read -p "确认执行更新？(输入 YES 继续): " confirm
    
    if [ "$confirm" != "YES" ]; then
        log_error "更新已取消"
        exit 1
    fi
}

# 创建备份目录
create_backup_dir() {
    BACKUP_DIR="backup/port_fix_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    log_info "📦 备份目录: $BACKUP_DIR"
}

# 更新高优先级文件
update_high_priority_files() {
    log_info "🔴 更新高优先级文件..."
    echo ""
    
    # 1. start-production.sh
    update_file "start-production.sh" \
        "更新输出信息" \
        "Portal: http://localhost:3000/" \
        "Sites Frontend: http://localhost:3001/"
    
    # 2. test-article-performance.sh
    update_file "test-article-performance.sh" \
        "更新默认测试 URL" \
        'BASE_URL="${1:-http://localhost:3000}"' \
        'BASE_URL="${1:-http://localhost:3001}"'
    
    # 3. generate_test_data.py
    update_file "generate_test_data.py" \
        "更新提示信息" \
        "http://localhost:3000/feed" \
        "http://localhost:3001/feed"
    
    # 4. show_device_fingerprints.py
    update_file "show_device_fingerprints.py" \
        "更新示例命令" \
        "http://localhost:3000/api" \
        "http://localhost:3001/api"
    
    # 5. infra/local/start_sites.sh
    update_file "infra/local/start_sites.sh" \
        "更新输出信息" \
        "Portal: http://localhost:3000" \
        "Sites Frontend: http://localhost:3001"
    
    # 6. sites/scripts/lighthouse-ci.js
    update_file "sites/scripts/lighthouse-ci.js" \
        "更新 Lighthouse 测试 URL" \
        "http://localhost:3000" \
        "http://localhost:3001"
    
    log_success "✅ 高优先级文件更新完成"
    echo ""
}

# 更新中优先级文件
update_medium_priority_files() {
    log_info "🟡 更新中优先级文件..."
    echo ""
    
    # 7. .env.core
    if check_file ".env.core"; then
        backup_file ".env.core"
        sed -i 's|FRONTEND_BASE_URL=http://localhost:3000|FRONTEND_BASE_URL=http://localhost:3001|g' .env.core
        log_success "✅ 已更新: .env.core - FRONTEND_BASE_URL"
    fi
    
    # 8. apps/api/middleware/cors.py
    if check_file "apps/api/middleware/cors.py"; then
        backup_file "apps/api/middleware/cors.py"
        # 在 localhost:3000 后面添加 localhost:3001（如果还没有）
        if grep -q "http://localhost:3000" "apps/api/middleware/cors.py"; then
            # 保留 3000，但确保也有 3001
            if ! grep -q "http://localhost:3001" "apps/api/middleware/cors.py"; then
                sed -i "s|'http://localhost:3000',|'http://localhost:3000',\n            'http://localhost:3001',|g" apps/api/middleware/cors.py
                log_success "✅ 已更新: apps/api/middleware/cors.py - 添加 3001 端口"
            else
                log_info "apps/api/middleware/cors.py 已包含 3001，跳过"
            fi
        fi
    fi
    
    # 9. apps/core/url_config.py
    if check_file "apps/core/url_config.py"; then
        backup_file "apps/core/url_config.py"
        # 添加 3001，保留 3000
        if ! grep -q "http://localhost:3001" "apps/core/url_config.py"; then
            sed -i "/http:\/\/localhost:3000/a\            'http://localhost:3001'" apps/core/url_config.py
            log_success "✅ 已更新: apps/core/url_config.py - 添加 3001 端口"
        else
            log_info "apps/core/url_config.py 已包含 3001，跳过"
        fi
    fi
    
    # 10. apps/core/site_utils.py
    if check_file "apps/core/site_utils.py"; then
        backup_file "apps/core/site_utils.py"
        
        # 添加 localhost:3001 映射
        if ! grep -q "'localhost:3001'" "apps/core/site_utils.py"; then
            sed -i "s/'localhost:3000': 'localhost',/'localhost:3000': 'localhost',\n    'localhost:3001': 'localhost',/g" apps/core/site_utils.py
            log_success "✅ 已更新: apps/core/site_utils.py - 添加 3001 映射"
        fi
        
        # 添加到 domains 列表
        if ! grep -q "localhost:3001" "apps/core/site_utils.py"; then
            sed -i "s/'localhost:3000'/'localhost:3000', 'localhost:3001'/g" apps/core/site_utils.py
            log_success "✅ 已更新: apps/core/site_utils.py - 添加 3001 到 domains"
        fi
    fi
    
    # 11. apps/news/management/commands/init_topic_data.py
    update_file "apps/news/management/commands/init_topic_data.py" \
        "更新站点创建提示" \
        "localhost:3000" \
        "localhost:3001"
    
    log_success "✅ 中优先级文件更新完成"
    echo ""
}

# 移动备份文件到备份目录
move_backups_to_dir() {
    log_info "📦 整理备份文件..."
    
    # 查找所有 .port-backup 文件
    find . -name "*.port-backup" -type f | while read backup_file; do
        # 保持目录结构
        relative_path=${backup_file#./}
        target_dir="$BACKUP_DIR/$(dirname "$relative_path")"
        mkdir -p "$target_dir"
        mv "$backup_file" "$target_dir/"
    done
    
    log_success "✅ 备份文件已整理到: $BACKUP_DIR"
}

# 验证更新
verify_updates() {
    log_info "🔍 验证更新结果..."
    echo ""
    
    local files_with_3000=0
    local files_checked=0
    
    # 检查关键文件
    local key_files=(
        "start-production.sh"
        "test-article-performance.sh"
        "generate_test_data.py"
        "show_device_fingerprints.py"
        "infra/local/start_sites.sh"
        ".env.core"
    )
    
    for file in "${key_files[@]}"; do
        if [ -f "$file" ]; then
            files_checked=$((files_checked + 1))
            if grep -q "localhost:3000" "$file"; then
                files_with_3000=$((files_with_3000 + 1))
                log_warning "⚠️  仍包含 localhost:3000: $file"
            fi
        fi
    done
    
    echo ""
    if [ $files_with_3000 -eq 0 ]; then
        log_success "✅ 验证通过！所有关键文件已更新"
    else
        log_warning "⚠️  $files_with_3000/$files_checked 个文件仍包含 localhost:3000"
        log_warning "这些可能是需要保留的引用（如容器内部端口）"
    fi
    echo ""
}

# 显示剩余引用
show_remaining_references() {
    log_info "🔍 扫描剩余的 localhost:3000 引用..."
    echo ""
    
    grep -r "localhost:3000" /opt/idp-cms \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=backup \
        --exclude-dir=logs \
        --exclude="*.md" \
        --exclude="*.log" \
        --exclude="*.backup" \
        -n | head -20
    
    echo ""
    log_info "💡 提示：以上引用可能是："
    echo "  - Docker 容器内部端口（不需要修改）"
    echo "  - CORS 兼容配置（同时支持 3000 和 3001）"
    echo "  - 需要手动检查的其他引用"
    echo ""
}

# 显示完成总结
show_summary() {
    echo ""
    echo "=========================================="
    log_success "🎉 端口引用更新完成！"
    echo "=========================================="
    echo ""
    log_info "📊 更新统计："
    echo "  ✅ 高优先级文件: 6 个"
    echo "  ✅ 中优先级文件: 5 个"
    echo "  📦 备份位置: $BACKUP_DIR"
    echo ""
    log_info "🔗 更新后的访问地址："
    echo "  ✅ Sites 前端: http://localhost:3001/"
    echo "  ✅ 后端 API: http://localhost:8000/"
    echo "  ✅ Wagtail Admin: http://localhost:8000/admin/"
    echo ""
    log_info "📚 后续步骤："
    echo "  1. 重启服务: ./start.sh"
    echo "  2. 测试前端: curl http://localhost:3001/"
    echo "  3. 验证功能: 浏览器访问各个页面"
    echo "  4. 查看详细清单: cat PORTAL_REFERENCES_TO_UPDATE.md"
    echo ""
    log_info "⚠️  回滚方法（如有需要）："
    echo "  备份文件保存在: $BACKUP_DIR"
    echo "  可以手动恢复或使用备份文件"
    echo ""
}

# 主函数
main() {
    log_info "🔧 Portal 端口引用快速修复脚本"
    echo ""
    
    # 1. 显示即将修改的文件
    show_files_to_update
    
    # 2. 确认执行
    confirm_update
    
    # 3. 创建备份目录
    create_backup_dir
    
    # 4. 更新高优先级文件
    update_high_priority_files
    
    # 5. 更新中优先级文件
    update_medium_priority_files
    
    # 6. 整理备份文件
    move_backups_to_dir
    
    # 7. 验证更新
    verify_updates
    
    # 8. 显示剩余引用
    show_remaining_references
    
    # 9. 显示总结
    show_summary
}

# 执行主函数
main

