#!/bin/bash
# =============================================================================
# 代码同步脚本
# =============================================================================
# 用途: 在双服务器之间同步代码和配置
# 方式: rsync over SSH
# 
# 使用方法:
#   ./sync-code.sh [SERVER2_IP] [--dry-run]
# 
# 前置条件:
#   - 配置 SSH 密钥认证
#   - 安装 rsync
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

SERVER2_IP=$1
DRY_RUN=false
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PATH="${REMOTE_PATH:-/opt/idp-cms}"
LOCAL_PATH="/opt/idp-cms"

[ "$2" = "--dry-run" ] && DRY_RUN=true

# 检查参数
if [ -z "$SERVER2_IP" ]; then
    log_error "请指定服务器2的IP地址"
    echo "用法: $0 SERVER2_IP [--dry-run]"
    exit 1
fi

# 检查 rsync
if ! command -v rsync &> /dev/null; then
    log_error "rsync 未安装"
    log_info "请运行: sudo apt install rsync"
    exit 1
fi

# 检查 SSH 连接
check_ssh() {
    log_info "检查 SSH 连接..."
    
    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${REMOTE_USER}@${SERVER2_IP} "echo 'SSH OK'" &> /dev/null; then
        log_success "SSH 连接正常"
    else
        log_error "无法连接到服务器2"
        log_info "请确保:"
        log_info "  1. SSH 服务正在运行"
        log_info "  2. 已配置 SSH 密钥认证"
        log_info "  3. 防火墙允许 SSH 连接"
        exit 1
    fi
}

# 同步代码
sync_code() {
    log_info "同步代码到服务器2..."
    
    local rsync_opts="-avz --delete"
    [ "$DRY_RUN" = true ] && rsync_opts="$rsync_opts --dry-run"
    
    # 排除目录
    local excludes=(
        ".git"
        ".env*"
        "node_modules"
        "__pycache__"
        "*.pyc"
        ".DS_Store"
        "logs"
        "media"
        "staticfiles"
        "celerybeat-schedule"
        ".venv"
        "venv"
        "*.log"
    )
    
    local exclude_args=""
    for exclude in "${excludes[@]}"; do
        exclude_args="$exclude_args --exclude=$exclude"
    done
    
    # 执行同步
    rsync $rsync_opts $exclude_args \
        ${LOCAL_PATH}/ \
        ${REMOTE_USER}@${SERVER2_IP}:${REMOTE_PATH}/ || {
        log_error "代码同步失败"
        return 1
    }
    
    if [ "$DRY_RUN" = true ]; then
        log_info "试运行完成（未实际同步）"
    else
        log_success "代码同步完成"
    fi
}

# 同步环境变量
sync_env() {
    log_info "同步环境变量..."
    
    if [ ! -f "${LOCAL_PATH}/.env.node2" ]; then
        log_warning ".env.node2 不存在，跳过环境变量同步"
        return 0
    fi
    
    if [ "$DRY_RUN" = false ]; then
        scp ${LOCAL_PATH}/.env.node2 \
            ${REMOTE_USER}@${SERVER2_IP}:${REMOTE_PATH}/.env.node2
        log_success "环境变量已同步"
    fi
}

# 同步配置文件
sync_configs() {
    log_info "同步配置文件..."
    
    if [ "$DRY_RUN" = false ]; then
        rsync -avz \
            ${LOCAL_PATH}/infra/configs/ \
            ${REMOTE_USER}@${SERVER2_IP}:${REMOTE_PATH}/infra/configs/
        log_success "配置文件已同步"
    fi
}

# 同步 Docker Compose 文件
sync_docker_compose() {
    log_info "同步 Docker Compose 文件..."
    
    if [ "$DRY_RUN" = false ]; then
        rsync -avz \
            ${LOCAL_PATH}/infra/ \
            ${REMOTE_USER}@${SERVER2_IP}:${REMOTE_PATH}/infra/ \
            --exclude="*.env"
        log_success "Docker Compose 文件已同步"
    fi
}

# 同步部署脚本
sync_scripts() {
    log_info "同步部署脚本..."
    
    if [ "$DRY_RUN" = false ]; then
        rsync -avz \
            ${LOCAL_PATH}/deploy/ \
            ${REMOTE_USER}@${SERVER2_IP}:${REMOTE_PATH}/deploy/
        
        # 确保脚本有执行权限
        ssh ${REMOTE_USER}@${SERVER2_IP} \
            "chmod +x ${REMOTE_PATH}/deploy/scripts/*.sh"
        
        log_success "部署脚本已同步"
    fi
}

# 重启服务器2的服务
restart_remote_services() {
    log_info "重启服务器2的服务..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "试运行模式，跳过服务重启"
        return 0
    fi
    
    read -p "是否重启服务器2的服务？(y/n): " restart
    if [ "$restart" = "y" ]; then
        ssh ${REMOTE_USER}@${SERVER2_IP} \
            "cd ${REMOTE_PATH} && docker compose -f infra/production/docker-compose-ha-node2.yml up -d --build"
        log_success "服务器2服务已重启"
    else
        log_info "跳过服务重启"
    fi
}

# 验证同步
verify_sync() {
    log_info "验证同步..."
    
    # 检查远程目录
    if ssh ${REMOTE_USER}@${SERVER2_IP} "[ -d ${REMOTE_PATH} ]"; then
        log_success "远程目录存在"
    else
        log_error "远程目录不存在"
        return 1
    fi
    
    # 比较文件数量
    local local_count=$(find ${LOCAL_PATH} -type f | wc -l)
    local remote_count=$(ssh ${REMOTE_USER}@${SERVER2_IP} "find ${REMOTE_PATH} -type f | wc -l")
    
    log_info "本地文件数: $local_count"
    log_info "远程文件数: $remote_count"
    
    # 检查关键文件
    local key_files=(
        "manage.py"
        "infra/production/docker-compose-ha-node2.yml"
        "deploy/scripts/deploy-ha-node2.sh"
    )
    
    for file in "${key_files[@]}"; do
        if ssh ${REMOTE_USER}@${SERVER2_IP} "[ -f ${REMOTE_PATH}/$file ]"; then
            log_success "  ✓ $file"
        else
            log_error "  ✗ $file 不存在"
        fi
    done
}

# 显示同步信息
show_sync_info() {
    echo ""
    echo "========================================="
    echo "  代码同步完成"
    echo "========================================="
    echo ""
    echo "同步信息:"
    echo "  源: ${LOCAL_PATH}"
    echo "  目标: ${REMOTE_USER}@${SERVER2_IP}:${REMOTE_PATH}"
    echo ""
    echo "下一步操作:"
    echo "1. 登录服务器2:"
    echo "   ssh ${REMOTE_USER}@${SERVER2_IP}"
    echo ""
    echo "2. 检查同步结果:"
    echo "   cd ${REMOTE_PATH}"
    echo "   ls -la"
    echo ""
    echo "3. 重启服务（如需要）:"
    echo "   ./deploy/scripts/deploy-ha-node2.sh"
    echo ""
    echo "========================================="
}

# 主函数
main() {
    echo ""
    echo "========================================="
    echo "  代码同步工具"
    echo "========================================="
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "试运行模式（不会实际同步）"
        echo ""
    fi
    
    check_ssh
    sync_code
    sync_env
    sync_configs
    sync_docker_compose
    sync_scripts
    verify_sync
    
    if [ "$DRY_RUN" = false ]; then
        restart_remote_services
    fi
    
    show_sync_info
}

main

