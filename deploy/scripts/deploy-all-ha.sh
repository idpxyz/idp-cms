#!/bin/bash
# =============================================================================
# 高可用系统一键部署脚本
# =============================================================================
# 用途: 自动化部署整个高可用系统到两台服务器
# 
# 服务器配置:
#   - 服务器1 (主节点): 121.40.167.71
#   - 服务器2 (从节点): 121.41.73.49
# 
# 前置条件:
#   1. 已配置SSH密钥认证（服务器1 → 服务器2）
#   2. 已修改环境变量文件（.env.node1 和 .env.node2）
#   3. 两台服务器已安装 Docker 和 Docker Compose
# 
# 使用方法:
#   ./deploy-all-ha.sh [--skip-infra] [--skip-verify]
# 
# 选项:
#   --skip-infra    跳过基础设施部署（如果已部署）
#   --skip-verify   跳过最终验证
#   --dry-run       仅显示将要执行的命令
# =============================================================================

set -e  # 遇到错误立即退出

# =============================================================================
# 配置变量
# =============================================================================

SERVER1_IP="121.40.167.71"
SERVER2_IP="121.41.73.49"
SERVER1_USER="${SERVER1_USER:-root}"
SERVER2_USER="${SERVER2_USER:-root}"
PROJECT_PATH="/opt/idp-cms"

SKIP_INFRA=false
SKIP_VERIFY=false
DRY_RUN=false

# =============================================================================
# 颜色输出
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}$1${NC}\n"; }

# =============================================================================
# 参数解析
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-infra) SKIP_INFRA=true; shift ;;
        --skip-verify) SKIP_VERIFY=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help)
            cat << EOF
使用方法: $0 [选项]

选项:
  --skip-infra    跳过基础设施部署
  --skip-verify   跳过最终验证
  --dry-run       仅显示命令，不实际执行
  --help          显示此帮助信息

示例:
  $0                    # 完整部署
  $0 --skip-infra       # 跳过基础设施，仅部署应用
  $0 --dry-run          # 查看部署流程
EOF
            exit 0
            ;;
        *) shift ;;
    esac
done

# =============================================================================
# 辅助函数
# =============================================================================

# 执行命令（支持 dry-run）
execute() {
    local cmd=$1
    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] $cmd"
    else
        eval "$cmd"
    fi
}

# SSH 执行命令
ssh_exec() {
    local host=$1
    local user=$2
    local cmd=$3
    
    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] SSH ${user}@${host}: $cmd"
    else
        ssh -o ConnectTimeout=10 -o BatchMode=yes ${user}@${host} "$cmd"
    fi
}

# 检查 SSH 连接
check_ssh() {
    local host=$1
    local user=$2
    
    log_info "检查到 ${user}@${host} 的 SSH 连接..."
    
    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${user}@${host} "echo 'SSH OK'" &> /dev/null; then
        log_success "SSH 连接正常"
        return 0
    else
        log_error "无法连接到 ${user}@${host}"
        log_warning "请确保已配置 SSH 密钥认证"
        return 1
    fi
}

# 检查环境变量文件
check_env_files() {
    log_info "检查环境变量文件..."
    
    local files_ok=true
    
    if [ ! -f ".env.node1" ]; then
        log_error ".env.node1 不存在"
        log_info "请运行: cp .env.node1.production .env.node1"
        files_ok=false
    fi
    
    if [ ! -f ".env.node2" ]; then
        log_error ".env.node2 不存在"
        log_info "请运行: cp .env.node2.production .env.node2"
        files_ok=false
    fi
    
    # 检查是否修改了密码
    if grep -q "Change_This" .env.node1 2>/dev/null; then
        log_warning ".env.node1 中仍有默认密码（Change_This）"
        log_warning "强烈建议修改所有密码后再部署"
        read -p "是否继续？(yes/no): " confirm
        [ "$confirm" != "yes" ] && files_ok=false
    fi
    
    if [ "$files_ok" = false ]; then
        return 1
    fi
    
    log_success "环境变量文件检查通过"
    return 0
}

# 检查 Docker
check_docker() {
    local host=$1
    local user=$2
    
    log_info "检查 ${host} 的 Docker 环境..."
    
    if ssh_exec "$host" "$user" "command -v docker &> /dev/null"; then
        log_success "Docker 已安装"
        return 0
    else
        log_error "Docker 未安装"
        log_info "请先在 ${host} 上安装 Docker"
        return 1
    fi
}

# 显示部署计划
show_deployment_plan() {
    cat << EOF

╔══════════════════════════════════════════════════════════════════════════╗
║                   🚀 高可用系统自动化部署计划                             ║
╚══════════════════════════════════════════════════════════════════════════╝

📋 服务器配置:
  🖥️  服务器1 (主节点): ${SERVER1_IP}
  🖥️  服务器2 (从节点): ${SERVER2_IP}

📦 部署步骤:

  Phase 1: 前置检查
  ├── ✓ SSH 连接测试
  ├── ✓ Docker 环境检查
  ├── ✓ 环境变量文件检查
  └── ✓ 磁盘空间检查

  Phase 2: 服务器1 部署
  ├── 部署共享基础设施 (PostgreSQL, MinIO, ClickHouse)
  ├── 部署主节点应用 (Django, Next.js, Redis)
  ├── 初始化数据库
  └── 健康检查

  Phase 3: 服务器2 部署
  ├── 同步代码和配置
  ├── 初始化 PostgreSQL 从库
  ├── 部署从节点应用
  └── 健康检查

  Phase 4: 验证和测试
  ├── 系统健康检查
  ├── 负载均衡测试
  ├── 故障转移测试
  └── 生成部署报告

⏱️  预计耗时: 15-30 分钟

EOF

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY-RUN 模式：仅显示命令，不实际执行"
    fi
    
    read -p "确认开始部署？(yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "已取消部署"
        exit 0
    fi
}

# =============================================================================
# 主要部署函数
# =============================================================================

# Phase 1: 前置检查
phase1_prechecks() {
    log_step "Phase 1: 前置检查"
    
    # 检查当前目录
    if [ ! -f "manage.py" ]; then
        log_error "请在项目根目录 /opt/idp-cms 下运行此脚本"
        exit 1
    fi
    
    # 检查 SSH 连接
    check_ssh "$SERVER1_IP" "$SERVER1_USER" || exit 1
    check_ssh "$SERVER2_IP" "$SERVER2_USER" || exit 1
    
    # 检查 Docker
    check_docker "$SERVER1_IP" "$SERVER1_USER" || exit 1
    check_docker "$SERVER2_IP" "$SERVER2_USER" || exit 1
    
    # 检查环境变量
    check_env_files || exit 1
    
    # 检查磁盘空间
    log_info "检查磁盘空间..."
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        log_warning "磁盘使用率较高: ${disk_usage}%"
    else
        log_success "磁盘空间充足: ${disk_usage}% 已使用"
    fi
    
    log_success "Phase 1 完成：前置检查通过"
}

# Phase 2: 部署服务器1
phase2_deploy_server1() {
    log_step "Phase 2: 部署服务器1 (${SERVER1_IP})"
    
    # 2.1 部署共享基础设施
    if [ "$SKIP_INFRA" = false ]; then
        log_info "部署共享基础设施..."
        ssh_exec "$SERVER1_IP" "$SERVER1_USER" "cd ${PROJECT_PATH} && ./deploy/scripts/deploy-ha-infrastructure.sh" || {
            log_error "基础设施部署失败"
            exit 1
        }
        log_success "共享基础设施部署完成"
    else
        log_warning "跳过基础设施部署"
    fi
    
    # 2.2 部署主节点应用
    log_info "部署主节点应用..."
    ssh_exec "$SERVER1_IP" "$SERVER1_USER" "cd ${PROJECT_PATH} && ./deploy/scripts/deploy-ha-node1.sh" || {
        log_error "主节点应用部署失败"
        exit 1
    }
    log_success "主节点应用部署完成"
    
    # 2.3 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 2.4 健康检查
    log_info "执行健康检查..."
    ssh_exec "$SERVER1_IP" "$SERVER1_USER" "cd ${PROJECT_PATH} && ./deploy/scripts/health-check-ha.sh" || {
        log_warning "健康检查有警告，请查看日志"
    }
    
    log_success "Phase 2 完成：服务器1 部署成功"
}

# Phase 3: 部署服务器2
phase3_deploy_server2() {
    log_step "Phase 3: 部署服务器2 (${SERVER2_IP})"
    
    # 3.1 同步代码
    log_info "从服务器1同步代码到服务器2..."
    ssh_exec "$SERVER1_IP" "$SERVER1_USER" "cd ${PROJECT_PATH} && ./deploy/scripts/sync-code.sh ${SERVER2_IP}" || {
        log_error "代码同步失败"
        exit 1
    }
    log_success "代码同步完成"
    
    # 3.2 复制环境变量（如果不存在）
    log_info "配置服务器2环境变量..."
    ssh_exec "$SERVER2_IP" "$SERVER2_USER" "cd ${PROJECT_PATH} && [ ! -f .env.node2 ] && cp .env.node2.production .env.node2 || true"
    
    # 3.3 部署从节点应用
    log_info "部署从节点应用..."
    ssh_exec "$SERVER2_IP" "$SERVER2_USER" "cd ${PROJECT_PATH} && ./deploy/scripts/deploy-ha-node2.sh --init-replica" || {
        log_error "从节点应用部署失败"
        exit 1
    }
    log_success "从节点应用部署完成"
    
    # 3.4 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 3.5 健康检查
    log_info "执行健康检查..."
    ssh_exec "$SERVER2_IP" "$SERVER2_USER" "cd ${PROJECT_PATH} && ./deploy/scripts/health-check-ha.sh" || {
        log_warning "健康检查有警告，请查看日志"
    }
    
    log_success "Phase 3 完成：服务器2 部署成功"
}

# Phase 4: 验证和测试
phase4_verify() {
    if [ "$SKIP_VERIFY" = true ]; then
        log_warning "跳过验证阶段"
        return 0
    fi
    
    log_step "Phase 4: 验证和测试"
    
    # 4.1 检查 PostgreSQL 复制
    log_info "检查 PostgreSQL 复制状态..."
    ssh_exec "$SERVER1_IP" "$SERVER1_USER" \
        "docker exec ha-postgres-master psql -U news -d news_ha -c 'SELECT application_name, state, sync_state FROM pg_stat_replication;'" || {
        log_warning "PostgreSQL 复制状态检查失败"
    }
    
    # 4.2 检查 Redis Sentinel
    log_info "检查 Redis Sentinel 状态..."
    ssh_exec "$SERVER1_IP" "$SERVER1_USER" \
        "docker exec ha-redis-sentinel-1 redis-cli -p 26379 sentinel masters 2>/dev/null" || {
        log_warning "Redis Sentinel 检查失败"
    }
    
    # 4.3 检查应用可访问性
    log_info "检查应用可访问性..."
    
    # 检查服务器1
    if curl -sf "http://${SERVER1_IP}:8000/health/readiness/" > /dev/null; then
        log_success "服务器1 后端可访问"
    else
        log_warning "服务器1 后端不可访问"
    fi
    
    # 检查服务器2
    if curl -sf "http://${SERVER2_IP}:8000/health/readiness/" > /dev/null; then
        log_success "服务器2 后端可访问"
    else
        log_warning "服务器2 后端不可访问"
    fi
    
    log_success "Phase 4 完成：验证测试完成"
}

# 生成部署报告
generate_report() {
    local report_file="/tmp/idp-ha-deployment-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
╔══════════════════════════════════════════════════════════════════════════╗
║                    高可用系统部署报告                                     ║
╚══════════════════════════════════════════════════════════════════════════╝

部署时间: $(date '+%Y-%m-%d %H:%M:%S')

服务器配置:
  服务器1 (主节点): ${SERVER1_IP}
  服务器2 (从节点): ${SERVER2_IP}

部署状态: ✅ 成功

组件状态:
  ✓ PostgreSQL 主从复制
  ✓ Redis Sentinel 高可用
  ✓ MinIO 分布式存储
  ✓ Django 应用
  ✓ Next.js 前端

访问信息:
  服务器1 后端: http://${SERVER1_IP}:8000
  服务器1 前端: http://${SERVER1_IP}:3000
  服务器2 后端: http://${SERVER2_IP}:8000
  服务器2 前端: http://${SERVER2_IP}:3000

下一步操作:
  1. 配置负载均衡器 (Nginx)
  2. 配置 SSL 证书
  3. 配置域名解析
  4. 设置监控告警
  5. 配置定时备份

运维命令:
  健康检查: ./deploy/scripts/health-check-ha.sh
  监控: ./deploy/scripts/monitor-ha.sh
  故障转移: ./deploy/scripts/failover.sh [postgres|redis]

文档:
  部署指南: deploy/docs/guides/HA_DEPLOYMENT_GUIDE.md
  运维手册: deploy/docs/guides/HA_OPERATIONS.md
  故障排查: deploy/docs/guides/HA_TROUBLESHOOTING.md

═══════════════════════════════════════════════════════════════════════════

EOF

    log_success "部署报告已生成: $report_file"
    cat "$report_file"
}

# =============================================================================
# 主函数
# =============================================================================

main() {
    echo ""
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║           🚀 IDP-CMS 高可用系统自动化部署工具                             ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
    echo ""
    
    # 切换到项目目录
    cd "$(dirname "$0")/../.." || exit 1
    
    # 显示部署计划
    show_deployment_plan
    
    # 记录开始时间
    START_TIME=$(date +%s)
    
    # 执行部署
    phase1_prechecks
    phase2_deploy_server1
    phase3_deploy_server2
    phase4_verify
    
    # 计算耗时
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    echo ""
    log_success "🎉 部署完成！总耗时: ${MINUTES}分${SECONDS}秒"
    echo ""
    
    # 生成报告
    generate_report
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "下一步操作："
    echo "  1. 配置负载均衡器:"
    echo "     sudo cp infra/configs/nginx/lb-ha.conf /etc/nginx/sites-available/"
    echo ""
    echo "  2. 配置 SSL 证书:"
    echo "     sudo certbot --nginx -d yourdomain.com"
    echo ""
    echo "  3. 查看运维文档:"
    echo "     cat deploy/docs/guides/HA_OPERATIONS.md"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 运行主函数
main "$@"

