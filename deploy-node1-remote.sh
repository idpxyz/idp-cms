#!/bin/bash

################################################################################
# 从本地部署到远程服务器1 - 单节点部署
# 用途: 从本地机器自动部署到服务器1 (121.40.167.71)
# 
# 使用方法:
#   ./deploy-node1-remote.sh                    # 标准部署
#   ./deploy-node1-remote.sh --no-cache         # 强制重新构建所有镜像
#   ./deploy-node1-remote.sh --rebuild-backend  # 只重建后端
#   ./deploy-node1-remote.sh --rebuild-frontend # 只重建前端
################################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
NODE1_IP="121.40.167.71"
SSH_USER="root"  # 根据实际情况修改
REMOTE_DIR="/opt/idp-cms"
LOCAL_DIR=$(pwd)

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     从本地部署到远程服务器1 (单节点模式)                     ║${NC}"
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

# 1. 前置检查
print_step "步骤 1/6: 前置检查"

echo "检查 SSH 连接..."
if ! ssh -o ConnectTimeout=5 $SSH_USER@$NODE1_IP "echo 'SSH连接成功'" > /dev/null 2>&1; then
    print_error "无法连接到服务器 $NODE1_IP"
    echo "请检查："
    echo "  1. 服务器 IP 是否正确"
    echo "  2. SSH 服务是否运行"
    echo "  3. 防火墙是否允许 SSH"
    echo "  4. 是否配置了 SSH 密钥"
    exit 1
fi
print_success "SSH 连接正常"

echo ""
echo "检查远程 Docker 环境..."
if ! ssh $SSH_USER@$NODE1_IP "docker --version" > /dev/null 2>&1; then
    print_warning "Docker 未安装，将自动安装..."
    ssh $SSH_USER@$NODE1_IP "curl -fsSL https://get.docker.com | sh"
    ssh $SSH_USER@$NODE1_IP "systemctl start docker && systemctl enable docker"
    print_success "Docker 安装完成"
else
    print_success "Docker 已安装"
fi

echo ""
echo "检查 Docker Compose..."
if ! ssh $SSH_USER@$NODE1_IP "docker-compose --version" > /dev/null 2>&1; then
    print_warning "Docker Compose 未安装，将自动安装..."
    ssh $SSH_USER@$NODE1_IP 'curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose'
    ssh $SSH_USER@$NODE1_IP "chmod +x /usr/local/bin/docker-compose"
    print_success "Docker Compose 安装完成"
else
    print_success "Docker Compose 已安装"
fi

# 2. 安装 rsync
print_step "步骤 2/7: 安装 rsync（如果需要）"

echo "检查远程 rsync..."
if ! ssh $SSH_USER@$NODE1_IP "which rsync" > /dev/null 2>&1; then
    print_warning "rsync 未安装，正在安装..."
    ssh $SSH_USER@$NODE1_IP "yum install -y rsync 2>/dev/null || apt-get update && apt-get install -y rsync"
    print_success "rsync 安装完成"
else
    print_success "rsync 已安装"
fi

# 3. 同步代码
print_step "步骤 3/7: 同步代码到服务器"

echo "创建远程目录..."
ssh $SSH_USER@$NODE1_IP "mkdir -p $REMOTE_DIR"

echo "同步代码（排除不必要的文件）..."
rsync -avz --progress --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.next' \
    --exclude='.next-local' \
    --exclude='data' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='.DS_Store' \
    --exclude='backups' \
    --exclude='media/original' \
    "$LOCAL_DIR/" \
    $SSH_USER@$NODE1_IP:$REMOTE_DIR/

print_success "代码同步完成"

# 4. 准备环境变量
print_step "步骤 4/7: 准备环境变量"

echo "检查本地环境变量文件..."
if [ ! -f "$LOCAL_DIR/.env.node1" ]; then
    if [ -f "$LOCAL_DIR/.env.node1.production" ]; then
        echo "使用 .env.node1.production 作为模板..."
        cp "$LOCAL_DIR/.env.node1.production" "$LOCAL_DIR/.env.node1"
        print_warning "请编辑 .env.node1 文件，填写密码等敏感信息"
        print_warning "编辑完成后按回车继续..."
        read
    else
        print_error "未找到环境变量文件"
        exit 1
    fi
fi

echo "上传环境变量到服务器..."
scp "$LOCAL_DIR/.env.node1" $SSH_USER@$NODE1_IP:$REMOTE_DIR/.env.node1

print_success "环境变量配置完成"

# 5. 创建数据目录
print_step "步骤 5/7: 创建数据目录"

ssh $SSH_USER@$NODE1_IP "cd $REMOTE_DIR && \
    mkdir -p data/{postgres,redis,minio,opensearch,clickhouse} && \
    mkdir -p logs/{nginx,django,nextjs} && \
    chmod -R 755 data/ logs/"

print_success "数据目录创建完成"

# 6. 执行部署
print_step "步骤 6/7: 执行部署"

echo "在远程服务器执行部署脚本..."
# 将本地的参数传递给远程脚本
ssh $SSH_USER@$NODE1_IP "cd $REMOTE_DIR && chmod +x deploy/scripts/deploy-node1-standalone.sh && ./deploy/scripts/deploy-node1-standalone.sh $*"

print_success "部署执行完成"

# 7. 健康检查
print_step "步骤 7/7: 健康检查"

echo "等待服务启动..."
sleep 15

echo "检查 Django 服务..."
if curl -sf http://$NODE1_IP:8000/health/ > /dev/null 2>&1; then
    print_success "Django 服务正常"
else
    print_warning "Django 服务未就绪（可能还在启动中）"
fi

echo ""
echo "检查 Next.js 服务..."
if curl -sf http://$NODE1_IP:3000/api/health > /dev/null 2>&1; then
    print_success "Next.js 服务正常"
else
    print_warning "Next.js 服务未就绪（可能还在启动中）"
fi

echo ""
echo "检查容器状态..."
ssh $SSH_USER@$NODE1_IP "cd $REMOTE_DIR && docker-compose -f infra/production/docker-compose-ha-node1.yml ps"

# 完成总结
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 🎉 部署完成！                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${GREEN}📍 服务访问地址:${NC}"
echo -e "   🌐 前端: http://$NODE1_IP:3000"
echo -e "   🔧 后端: http://$NODE1_IP:8000"
echo -e "   👨‍💼 管理后台: http://$NODE1_IP:8000/admin/"
echo -e "   📦 MinIO: http://$NODE1_IP:9001"

echo ""
echo -e "${GREEN}🔍 常用命令:${NC}"
echo -e "   查看日志: ssh $SSH_USER@$NODE1_IP 'cd $REMOTE_DIR && docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f'"
echo -e "   重启服务: ssh $SSH_USER@$NODE1_IP 'cd $REMOTE_DIR && docker-compose -f infra/production/docker-compose-ha-node1.yml restart'"
echo -e "   查看状态: ssh $SSH_USER@$NODE1_IP 'cd $REMOTE_DIR && docker-compose -f infra/production/docker-compose-ha-node1.yml ps'"

echo ""
echo -e "${YELLOW}📝 下一步操作:${NC}"
echo -e "   1. 访问 http://$NODE1_IP:8000/admin/ 创建超级用户"
echo -e "   2. 配置域名和 SSL 证书"
echo -e "   3. 设置定时备份任务"
echo -e "   4. 当需要高可用时，运行: ./deploy/scripts/upgrade-to-ha.sh"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 单节点部署成功完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

