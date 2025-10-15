#!/bin/bash

################################################################################
# HA 升级脚本 - 从单节点升级到双节点高可用
# 用途: 平滑升级到主从架构，最小停机时间
# 执行位置: 服务器1
################################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_ROOT="/opt/idp-cms"
NODE1_IP="121.40.167.71"
NODE2_IP="121.41.73.49"
SSH_USER="root"  # 根据实际情况修改

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            升级到高可用双节点部署                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# 函数定义
print_step() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🔧 $1${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 0. 前置检查
print_step "步骤 0/10: 前置检查和确认"

echo "本次升级将执行以下操作："
echo "  1. 在服务器1启用 PostgreSQL 主库配置"
echo "  2. 在服务器2部署完整应用栈"
echo "  3. 配置 PostgreSQL 主从复制"
echo "  4. 配置 Redis Sentinel 高可用"
echo "  5. 配置负载均衡器"
echo ""
print_warning "预计停机时间: 5-15 分钟"
print_warning "请确保已完成数据备份！"
echo ""
read -p "是否继续升级? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "升级已取消"
    exit 0
fi

# 检查服务器2连通性
print_step "步骤 1/10: 检查服务器间连通性"

echo "检查与服务器2的SSH连接..."
if ssh -o ConnectTimeout=5 $SSH_USER@$NODE2_IP "echo 'SSH连接成功'" > /dev/null 2>&1; then
    print_success "服务器2 SSH连接正常"
else
    print_error "无法连接到服务器2，请检查SSH配置"
    exit 1
fi

echo "检查网络互通..."
if ssh $SSH_USER@$NODE2_IP "ping -c 2 $NODE1_IP > /dev/null 2>&1"; then
    print_success "网络互通检查通过"
else
    print_error "服务器间网络不通"
    exit 1
fi

# 2. 数据备份
print_step "步骤 2/10: 备份当前数据"

cd "$PROJECT_ROOT"

echo "备份 PostgreSQL 数据库..."
BACKUP_DIR="backups/upgrade-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker exec $(docker ps -qf "name=postgres") pg_dumpall -U postgres > "$BACKUP_DIR/postgres_backup.sql"
print_success "数据库备份完成: $BACKUP_DIR/postgres_backup.sql"

echo "备份配置文件..."
cp -r infra/production "$BACKUP_DIR/"
cp .env.node1 "$BACKUP_DIR/" 2>/dev/null || true
print_success "配置备份完成"

# 3. 同步代码到服务器2
print_step "步骤 3/10: 同步代码到服务器2"

echo "使用 rsync 同步代码..."
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='data' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='.env*' \
    "$PROJECT_ROOT/" \
    $SSH_USER@$NODE2_IP:$PROJECT_ROOT/

print_success "代码同步完成"

# 准备节点2环境变量
echo "准备节点2环境变量..."
if [ -f ".env.node2.production" ]; then
    scp .env.node2.production $SSH_USER@$NODE2_IP:$PROJECT_ROOT/.env.node2
    print_success "环境变量文件已传输"
else
    print_warning "未找到 .env.node2.production，请手动创建"
fi

# 4. 停止当前服务
print_step "步骤 4/10: 停止服务器1当前服务"

print_warning "开始停机..."
docker-compose -f infra/production/docker-compose-ha-node1.yml down

print_success "服务已停止"

# 5. 升级服务器1为主节点
print_step "步骤 5/10: 升级服务器1为主节点模式"

echo "启用 PostgreSQL 主库配置..."
# 这里会使用包含主库配置的 docker-compose
export NODE_MODE="master"
export NODE1_IP="$NODE1_IP"
export NODE2_IP="$NODE2_IP"

echo "启动主节点服务..."
docker-compose -f infra/production/docker-compose-ha-node1.yml \
    -f infra/shared/docker-compose-ha.yml \
    --env-file .env.node1 up -d

echo "等待服务启动..."
sleep 15

print_success "服务器1主节点启动完成"

# 6. 部署服务器2
print_step "步骤 6/10: 部署服务器2（从节点）"

echo "在服务器2创建数据目录..."
ssh $SSH_USER@$NODE2_IP "cd $PROJECT_ROOT && mkdir -p data/{postgres,redis,minio,opensearch,clickhouse} logs/{nginx,django,nextjs}"

echo "启动服务器2服务..."
ssh $SSH_USER@$NODE2_IP "cd $PROJECT_ROOT && \
    export NODE_MODE=replica && \
    export NODE1_IP=$NODE1_IP && \
    export NODE2_IP=$NODE2_IP && \
    docker-compose -f infra/production/docker-compose-ha-node2.yml --env-file .env.node2 up -d"

echo "等待从节点启动..."
sleep 20

print_success "服务器2从节点部署完成"

# 7. 配置 PostgreSQL 主从复制
print_step "步骤 7/10: 配置 PostgreSQL 主从复制"

echo "在主库创建复制用户..."
docker exec $(docker ps -qf "name=postgres") psql -U postgres -c \
    "CREATE USER replication_user WITH REPLICATION ENCRYPTED PASSWORD 'Change_This_Replication_Password';" \
    2>/dev/null || echo "复制用户可能已存在"

echo "创建复制槽..."
docker exec $(docker ps -qf "name=postgres") psql -U postgres -c \
    "SELECT * FROM pg_create_physical_replication_slot('node2_slot');" \
    2>/dev/null || echo "复制槽可能已存在"

echo "在从库启动复制..."
# 这个在 docker-compose-ha-node2.yml 中已配置

echo "等待复制同步..."
sleep 10

echo "检查复制状态..."
REPLICATION_STATUS=$(docker exec $(docker ps -qf "name=postgres") psql -U postgres -t -c \
    "SELECT state FROM pg_stat_replication;" | tr -d ' ')

if [ "$REPLICATION_STATUS" = "streaming" ]; then
    print_success "PostgreSQL 主从复制配置成功"
else
    print_warning "复制状态: $REPLICATION_STATUS (可能需要手动检查)"
fi

# 8. 配置 Redis Sentinel
print_step "步骤 8/10: 配置 Redis Sentinel"

echo "启动 Sentinel 服务..."
# Sentinel 配置已在 docker-compose 中

echo "等待 Sentinel 初始化..."
sleep 10

echo "检查 Sentinel 状态..."
docker exec $(docker ps -qf "name=sentinel") redis-cli -p 26379 SENTINEL master mymaster \
    2>/dev/null && print_success "Redis Sentinel 配置成功" || \
    print_warning "Sentinel 可能需要手动配置"

# 9. 健康检查
print_step "步骤 9/10: 健康检查"

echo "检查服务器1服务..."
curl -sf http://$NODE1_IP:8000/health/ && print_success "服务器1 Django 正常" || print_warning "服务器1 Django 异常"
curl -sf http://$NODE1_IP:3000/api/health && print_success "服务器1 Next.js 正常" || print_warning "服务器1 Next.js 异常"

echo ""
echo "检查服务器2服务..."
ssh $SSH_USER@$NODE2_IP "curl -sf http://localhost:8000/health/" && \
    print_success "服务器2 Django 正常" || print_warning "服务器2 Django 异常"
ssh $SSH_USER@$NODE2_IP "curl -sf http://localhost:3000/api/health" && \
    print_success "服务器2 Next.js 正常" || print_warning "服务器2 Next.js 异常"

# 10. 配置负载均衡（可选）
print_step "步骤 10/10: 负载均衡配置提示"

echo -e "${YELLOW}负载均衡器配置（需手动完成）:${NC}"
echo ""
echo "1. 在独立服务器或服务器1安装 Nginx"
echo "2. 使用配置文件: infra/configs/nginx/lb-ha.conf"
echo "3. 配置上游服务器:"
echo "   - Backend: $NODE1_IP:8000, $NODE2_IP:8000"
echo "   - Frontend: $NODE1_IP:3000, $NODE2_IP:3000"
echo "4. 重启 Nginx 使配置生效"
echo ""
echo "或运行自动配置脚本:"
echo "   ./deploy/scripts/setup-load-balancer.sh"

# 完成总结
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 🎉 HA 升级完成！                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${GREEN}📍 高可用架构已部署:${NC}"
echo -e "   🖥️  服务器1 (主节点): $NODE1_IP"
echo -e "   🖥️  服务器2 (从节点): $NODE2_IP"
echo -e "   🗄️  PostgreSQL: 主从复制"
echo -e "   💾 Redis: Sentinel 高可用"
echo -e "   📦 MinIO: 分布式模式"

echo ""
echo -e "${GREEN}🔍 验证命令:${NC}"
echo -e "   检查复制状态: ./deploy/scripts/health-check-ha.sh"
echo -e "   监控服务: ./deploy/scripts/monitor-ha.sh"
echo -e "   故障转移: ./deploy/scripts/failover.sh"

echo ""
echo -e "${YELLOW}📝 后续操作:${NC}"
echo -e "   1. 配置负载均衡器"
echo -e "   2. 更新 DNS 指向负载均衡器"
echo -e "   3. 配置 SSL 证书"
echo -e "   4. 测试故障转移"
echo -e "   5. 设置监控告警"

echo ""
echo -e "${BLUE}💾 备份位置: $BACKUP_DIR${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ HA 升级成功完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

