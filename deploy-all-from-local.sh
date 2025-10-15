#!/bin/bash
# =============================================================================
# 从本地电脑一键部署到双服务器
# =============================================================================
# 用途: 从本地电脑直接部署整个高可用系统到两台服务器
# 
# 使用方法:
#   ./deploy-all-from-local.sh
# 
# 前置条件:
#   1. 本地可以 SSH 到两台服务器
#   2. 两台服务器已安装 Docker
#   3. 已配置环境变量文件
# =============================================================================

set -e

# 服务器配置
SERVER1="121.40.167.71"
SERVER2="121.41.73.49"
USER="${SSH_USER:-root}"
PROJECT_PATH="/opt/idp-cms"

# 颜色输出
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
# 显示横幅
# =============================================================================

cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║      🚀 从本地电脑一键部署 IDP-CMS 高可用系统                             ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

EOF

echo "📋 服务器配置:"
echo "  🖥️  服务器1 (主节点): ${SERVER1}"
echo "  🖥️  服务器2 (从节点): ${SERVER2}"
echo ""

# =============================================================================
# 前置检查
# =============================================================================

log_step "Step 1: 前置检查"

# 检查 SSH 连接
log_info "检查 SSH 连接..."

if ! ssh -o ConnectTimeout=5 ${USER}@${SERVER1} "echo 'SSH OK'" &> /dev/null; then
    log_error "无法连接到服务器1 (${SERVER1})"
    log_info "请确保可以通过 SSH 登录: ssh ${USER}@${SERVER1}"
    exit 1
fi
log_success "服务器1 SSH 连接正常"

if ! ssh -o ConnectTimeout=5 ${USER}@${SERVER2} "echo 'SSH OK'" &> /dev/null; then
    log_error "无法连接到服务器2 (${SERVER2})"
    log_info "请确保可以通过 SSH 登录: ssh ${USER}@${SERVER2}"
    exit 1
fi
log_success "服务器2 SSH 连接正常"

# 检查项目目录
log_info "检查项目目录..."

if ! ssh ${USER}@${SERVER1} "[ -d ${PROJECT_PATH} ]" 2>/dev/null; then
    log_warning "服务器1上不存在项目目录，将创建..."
    ssh ${USER}@${SERVER1} "sudo mkdir -p ${PROJECT_PATH} && sudo chown -R ${USER}:${USER} ${PROJECT_PATH}"
fi

if ! ssh ${USER}@${SERVER2} "[ -d ${PROJECT_PATH} ]" 2>/dev/null; then
    log_warning "服务器2上不存在项目目录，将创建..."
    ssh ${USER}@${SERVER2} "sudo mkdir -p ${PROJECT_PATH} && sudo chown -R ${USER}:${USER} ${PROJECT_PATH}"
fi

log_success "前置检查完成"

# =============================================================================
# 部署流程
# =============================================================================

log_step "Step 2: 上传代码和配置到服务器1"

log_info "同步代码到服务器1..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='logs' \
    --exclude='media' \
    --exclude='.env.local' \
    ./ ${USER}@${SERVER1}:${PROJECT_PATH}/

log_success "代码已同步到服务器1"

# =============================================================================

log_step "Step 3: 在服务器1配置环境"

log_info "配置服务器1环境变量..."
ssh ${USER}@${SERVER1} << 'ENDSSH'
cd /opt/idp-cms
if [ ! -f .env.node1 ]; then
    cp .env.node1.production .env.node1
    echo "✓ 已创建 .env.node1"
else
    echo "✓ .env.node1 已存在"
fi

# 配置SSH密钥（如果需要）
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa
    echo "✓ 已生成 SSH 密钥"
fi
ENDSSH

log_success "服务器1环境配置完成"

# =============================================================================

log_step "Step 4: 配置服务器1到服务器2的SSH"

log_info "配置SSH密钥..."
SERVER1_PUBKEY=$(ssh ${USER}@${SERVER1} "cat ~/.ssh/id_rsa.pub 2>/dev/null || echo ''")

if [ -n "$SERVER1_PUBKEY" ]; then
    ssh ${USER}@${SERVER2} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$SERVER1_PUBKEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    log_success "SSH密钥已配置"
else
    log_warning "服务器1的SSH公钥不存在"
fi

# =============================================================================

log_step "Step 5: 部署服务器1（主节点）"

log_info "开始部署..."
ssh ${USER}@${SERVER1} << 'ENDSSH'
cd /opt/idp-cms

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "部署共享基础设施..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./deploy/scripts/deploy-ha-infrastructure.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "部署主节点应用..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./deploy/scripts/deploy-ha-node1.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "执行健康检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./deploy/scripts/health-check-ha.sh
ENDSSH

log_success "服务器1部署完成"

# =============================================================================

log_step "Step 6: 同步代码到服务器2"

log_info "从服务器1同步代码到服务器2..."
ssh ${USER}@${SERVER1} "cd ${PROJECT_PATH} && ./deploy/scripts/sync-code.sh ${SERVER2}"

log_success "代码已同步到服务器2"

# =============================================================================

log_step "Step 7: 部署服务器2（从节点）"

log_info "配置服务器2环境..."
ssh ${USER}@${SERVER2} << 'ENDSSH'
cd /opt/idp-cms
if [ ! -f .env.node2 ]; then
    cp .env.node2.production .env.node2
    echo "✓ 已创建 .env.node2"
else
    echo "✓ .env.node2 已存在"
fi
ENDSSH

log_info "开始部署从节点..."
ssh ${USER}@${SERVER2} << 'ENDSSH'
cd /opt/idp-cms

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "部署从节点应用..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./deploy/scripts/deploy-ha-node2.sh --init-replica

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "执行健康检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./deploy/scripts/health-check-ha.sh
ENDSSH

log_success "服务器2部署完成"

# =============================================================================

log_step "Step 8: 最终验证"

log_info "验证服务可访问性..."

# 检查服务器1
if curl -sf "http://${SERVER1}:8000/health/readiness/" > /dev/null 2>&1; then
    log_success "✓ 服务器1后端正常: http://${SERVER1}:8000"
else
    log_warning "✗ 服务器1后端可能未就绪"
fi

if curl -sf "http://${SERVER1}:3000/api/health" > /dev/null 2>&1; then
    log_success "✓ 服务器1前端正常: http://${SERVER1}:3000"
else
    log_warning "✗ 服务器1前端可能未就绪"
fi

# 检查服务器2
if curl -sf "http://${SERVER2}:8000/health/readiness/" > /dev/null 2>&1; then
    log_success "✓ 服务器2后端正常: http://${SERVER2}:8000"
else
    log_warning "✗ 服务器2后端可能未就绪"
fi

if curl -sf "http://${SERVER2}:3000/api/health" > /dev/null 2>&1; then
    log_success "✓ 服务器2前端正常: http://${SERVER2}:3000"
else
    log_warning "✗ 服务器2前端可能未就绪"
fi

# =============================================================================
# 部署完成
# =============================================================================

echo ""
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                     🎉 部署完成！                                         ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

EOF

cat << EOF
✅ 部署总结:

  服务器1 (主节点): ${SERVER1}
    - 后端: http://${SERVER1}:8000
    - 前端: http://${SERVER1}:3000
    - Admin: http://${SERVER1}:8000/admin/

  服务器2 (从节点): ${SERVER2}
    - 后端: http://${SERVER2}:8000
    - 前端: http://${SERVER2}:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 下一步操作:

  1️⃣  配置负载均衡器 (Nginx):
     sudo apt install nginx -y
     sudo cp ${PROJECT_PATH}/infra/configs/nginx/lb-ha.conf /etc/nginx/sites-available/
     # 修改配置中的IP和域名
     sudo nginx -t && sudo systemctl reload nginx

  2️⃣  配置 SSL 证书:
     sudo apt install certbot python3-certbot-nginx -y
     sudo certbot --nginx -d yourdomain.com

  3️⃣  配置防火墙:
     sudo ufw allow 80/tcp
     sudo ufw allow 443/tcp
     sudo ufw enable

  4️⃣  设置监控:
     ssh ${USER}@${SERVER1} "crontab -e"
     # 添加: */5 * * * * ${PROJECT_PATH}/deploy/scripts/monitor-ha.sh --alert

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 文档:
  - 完整部署指南: ${PROJECT_PATH}/deploy/docs/guides/HA_DEPLOYMENT_GUIDE.md
  - 运维手册: ${PROJECT_PATH}/deploy/docs/guides/HA_OPERATIONS.md
  - 故障排查: ${PROJECT_PATH}/deploy/docs/guides/HA_TROUBLESHOOTING.md

🔧 管理命令:
  # SSH 登录服务器
  ssh ${USER}@${SERVER1}
  ssh ${USER}@${SERVER2}

  # 健康检查
  ssh ${USER}@${SERVER1} "cd ${PROJECT_PATH} && ./deploy/scripts/health-check-ha.sh"

  # 查看日志
  ssh ${USER}@${SERVER1} "docker logs -f node1-authoring"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

log_success "部署成功完成！🚀"
echo ""

