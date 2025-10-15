#!/bin/bash
# =============================================================================
# 更新服务器IP地址配置脚本
# =============================================================================
# 自动将配置文件中的占位符IP替换为实际IP地址
# 
# 使用方法:
#   ./update-server-ips.sh
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

# 您的服务器IP
SERVER1_IP="121.40.167.71"
SERVER2_IP="121.41.73.49"

echo ""
echo "========================================="
echo "  更新服务器IP配置"
echo "========================================="
echo ""
echo "服务器1 (主节点): $SERVER1_IP"
echo "服务器2 (从节点): $SERVER2_IP"
echo ""

# 确认操作
read -p "确认要更新配置文件中的IP地址吗？(y/n): " confirm
if [ "$confirm" != "y" ]; then
    log_info "已取消操作"
    exit 0
fi

cd /opt/idp-cms

# 备份原配置
BACKUP_DIR="/tmp/ip-config-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

log_info "备份原配置到: $BACKUP_DIR"

# 需要更新的文件列表
files=(
    "infra/configs/nginx/lb-ha.conf"
    "infra/configs/nginx/upstream.conf"
    "infra/configs/postgresql/replica.conf"
    "infra/configs/redis/sentinel.conf"
    "infra/configs/redis/redis-replica.conf"
    ".env.node1.production"
    ".env.node2.production"
)

# 更新文件中的IP
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        log_info "更新 $file"
        
        # 备份
        cp "$file" "$BACKUP_DIR/" 2>/dev/null || true
        
        # 替换 IP 占位符
        sed -i "s/SERVER1_IP/$SERVER1_IP/g" "$file"
        sed -i "s/SERVER2_IP/$SERVER2_IP/g" "$file"
        sed -i "s/192\.168\.1\.10/$SERVER1_IP/g" "$file"
        sed -i "s/192\.168\.1\.11/$SERVER2_IP/g" "$file"
        
        log_success "✓ $file"
    else
        log_warning "文件不存在: $file"
    fi
done

echo ""
log_success "所有配置文件已更新！"
echo ""
echo "更新内容："
echo "  192.168.1.10 → $SERVER1_IP"
echo "  192.168.1.11 → $SERVER2_IP"
echo "  SERVER1_IP   → $SERVER1_IP"
echo "  SERVER2_IP   → $SERVER2_IP"
echo ""
echo "备份位置: $BACKUP_DIR"
echo ""
echo "下一步："
echo "1. 检查 .env.node1.production 和 .env.node2.production"
echo "2. 修改所有密码"
echo "3. 开始部署: ./deploy/scripts/deploy-ha-infrastructure.sh"
echo ""

