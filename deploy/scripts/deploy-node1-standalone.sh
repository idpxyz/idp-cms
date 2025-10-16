#!/bin/bash

################################################################################
# 单节点部署脚本 - 服务器1独立运行模式
# 用途: 快速部署单服务器，未来可平滑升级到HA模式
# 服务器: 121.40.167.71
# 
# 使用方法:
#   ./deploy-node1-standalone.sh                    # 标准部署
#   ./deploy-node1-standalone.sh --no-cache         # 强制重新构建所有镜像
#   ./deploy-node1-standalone.sh --rebuild-backend  # 只重建后端
#   ./deploy-node1-standalone.sh --rebuild-frontend # 只重建前端
#   ./deploy-node1-standalone.sh --help             # 显示帮助
################################################################################

set -e

# 解析命令行参数
NO_CACHE=false
REBUILD_BACKEND=false
REBUILD_FRONTEND=false

for arg in "$@"; do
  case $arg in
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --rebuild-backend)
      REBUILD_BACKEND=true
      shift
      ;;
    --rebuild-frontend)
      REBUILD_FRONTEND=true
      shift
      ;;
    --help|-h)
      echo "使用方法:"
      echo "  $0                    # 标准部署"
      echo "  $0 --no-cache         # 强制重新构建所有镜像（忽略缓存）"
      echo "  $0 --rebuild-backend  # 强制重建后端镜像"
      echo "  $0 --rebuild-frontend # 强制重建前端镜像"
      echo "  $0 --help             # 显示此帮助信息"
      exit 0
      ;;
    *)
      echo "未知参数: $arg"
      echo "使用 --help 查看帮助"
      exit 1
      ;;
  esac
done

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_ROOT="/opt/idp-cms"
NODE1_IP="121.40.167.71"
ENV_FILE=".env.node1"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         单节点部署 - 服务器 1 (121.40.167.71)              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# 函数：打印步骤
print_step() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🔧 $1${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 函数：检查命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ 错误: $1 未安装${NC}"
        exit 1
    fi
}

# 1. 环境检查
print_step "步骤 1/8: 环境检查"

echo "检查必要的命令..."
check_command docker
check_command docker-compose

echo "检查 Docker 服务状态..."
if ! systemctl is-active --quiet docker; then
    echo -e "${RED}❌ Docker 服务未运行${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"

# 2. 准备环境变量
print_step "步骤 2/8: 准备环境变量"

cd "$PROJECT_ROOT"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env.node1.production" ]; then
        echo "复制环境变量模板..."
        cp .env.node1.production "$ENV_FILE"
        echo -e "${YELLOW}⚠️  请编辑 $ENV_FILE 填写密码和敏感信息${NC}"
        echo -e "${YELLOW}⚠️  按任意键继续...${NC}"
        read -n 1 -s
    else
        echo -e "${RED}❌ 找不到环境变量模板文件${NC}"
        exit 1
    fi
fi

# 设置单节点模式环境变量
export NODE_MODE="standalone"
export NODE1_IP="$NODE1_IP"

echo -e "${GREEN}✅ 环境变量准备完成${NC}"

# 3. 停止现有服务
print_step "步骤 3/8: 停止现有服务（如果存在）"

echo "停止可能运行中的服务..."
docker-compose -f infra/production/docker-compose.yml down 2>/dev/null || true
docker-compose -f infra/production/docker-compose-ha-node1.yml down 2>/dev/null || true

echo -e "${GREEN}✅ 现有服务已停止${NC}"

# 4. 创建必要的目录
print_step "步骤 4/8: 创建数据目录"

echo "创建 PostgreSQL 数据目录..."
mkdir -p data/postgres

echo "创建 Redis 数据目录..."
mkdir -p data/redis

echo "创建 MinIO 数据目录..."
mkdir -p data/minio

echo "创建 OpenSearch 数据目录..."
mkdir -p data/opensearch

echo "创建 ClickHouse 数据目录..."
mkdir -p data/clickhouse

echo "创建日志目录..."
mkdir -p logs/{nginx,django,nextjs,redis,opensearch,clickhouse}

echo "设置目录权限..."
chmod -R 777 logs/
chmod -R 755 data/

echo -e "${GREEN}✅ 数据目录和日志目录创建完成${NC}"

# 5. 拉取 Docker 镜像
print_step "步骤 5/8: 拉取 Docker 镜像"

echo "拉取最新镜像（这可能需要几分钟）..."
docker-compose -f infra/production/docker-compose-ha-node1.yml pull

echo -e "${GREEN}✅ 镜像拉取完成${NC}"

# 6. 启动服务
print_step "步骤 6/8: 启动服务"

echo "创建 Docker 网络（如果不存在）..."
docker network create --driver bridge --subnet=172.28.0.0/16 idp-ha-network 2>/dev/null || \
    echo -e "${GREEN}✅ 网络已存在${NC}"

echo ""
echo -e "${BLUE}━━━ 第一阶段：启动基础设施服务 ━━━${NC}"
echo "停止并删除现有基础设施容器..."
docker-compose -f infra/production/docker-compose-ha-infra.yml down --remove-orphans 2>/dev/null || true

echo "启动共享基础设施（PostgreSQL, Redis, ClickHouse, OpenSearch, MinIO）..."
docker-compose -f infra/production/docker-compose-ha-infra.yml --env-file "$ENV_FILE" up -d

echo "等待基础设施服务启动..."
sleep 20

echo -e "${GREEN}✅ 基础设施服务启动完成${NC}"

echo ""
echo -e "${BLUE}━━━ 第二阶段：启动应用服务 ━━━${NC}"
echo "停止现有应用容器..."
# 注意：不使用 --remove-orphans，避免删除基础设施容器（ha-postgres, ha-redis 等）
docker-compose -f infra/production/docker-compose-ha-node1.yml stop
docker-compose -f infra/production/docker-compose-ha-node1.yml rm -f

# 根据参数决定构建策略
BUILD_ARGS=""
if [ "$NO_CACHE" = true ]; then
    echo "🔨 强制重新构建所有镜像（无缓存）..."
    docker-compose -f infra/production/docker-compose-ha-node1.yml build --no-cache
elif [ "$REBUILD_BACKEND" = true ]; then
    echo "🔨 强制重建后端镜像..."
    docker-compose -f infra/production/docker-compose-ha-node1.yml build --no-cache authoring celery celery-beat
elif [ "$REBUILD_FRONTEND" = true ]; then
    echo "🔨 强制重建前端镜像..."
    docker-compose -f infra/production/docker-compose-ha-node1.yml build --no-cache frontend
fi

echo "启动应用服务（Django, Next.js, Celery）..."
docker-compose -f infra/production/docker-compose-ha-node1.yml --env-file "$ENV_FILE" up -d

echo "等待应用服务启动..."
sleep 15

echo -e "${GREEN}✅ 应用服务启动完成${NC}"

# 7. 健康检查
print_step "步骤 7/8: 健康检查"

echo "检查基础设施服务状态..."
docker-compose -f infra/production/docker-compose-ha-infra.yml ps

echo ""
echo "检查应用服务状态..."
docker-compose -f infra/production/docker-compose-ha-node1.yml ps

echo ""
echo "检查数据库连接..."
timeout 30 bash -c 'until docker exec ha-postgres pg_isready -U ${POSTGRES_USER:-news}; do sleep 2; done' && \
    echo -e "${GREEN}✅ PostgreSQL 就绪${NC}" || \
    echo -e "${RED}❌ PostgreSQL 启动失败${NC}"

echo ""
echo "检查 Redis 连接..."
timeout 30 bash -c 'until docker exec ha-redis redis-cli --no-auth-warning -a ${REDIS_PASSWORD:-SecureRedisPass123!} ping | grep -q PONG; do sleep 2; done' && \
    echo -e "${GREEN}✅ Redis 就绪${NC}" || \
    echo -e "${RED}❌ Redis 启动失败${NC}"

echo ""
echo "检查 ClickHouse 连接..."
timeout 30 bash -c 'until docker exec ha-clickhouse clickhouse-client --query "SELECT 1" > /dev/null 2>&1; do sleep 2; done' && \
    echo -e "${GREEN}✅ ClickHouse 就绪${NC}" || \
    echo -e "${YELLOW}⚠️  ClickHouse 未就绪${NC}"

echo ""
echo "检查 OpenSearch 连接..."
timeout 30 bash -c 'until docker exec ha-opensearch curl -f -k -u admin:${OPENSEARCH_PASSWORD:-admin} https://localhost:9200 > /dev/null 2>&1; do sleep 2; done' && \
    echo -e "${GREEN}✅ OpenSearch 就绪${NC}" || \
    echo -e "${YELLOW}⚠️  OpenSearch 未就绪${NC}"

echo ""
echo "检查应用服务..."
sleep 5

# Django 健康检查
if curl -sf http://localhost:8000/health/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Django 服务就绪${NC}"
else
    echo -e "${YELLOW}⚠️  Django 服务未就绪（可能还在启动中）${NC}"
fi

# Next.js 健康检查
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Next.js 服务就绪${NC}"
else
    echo -e "${YELLOW}⚠️  Next.js 服务未就绪（可能还在启动中）${NC}"
fi

# 8. 部署总结
print_step "步骤 8/8: 部署总结"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   🎉 部署完成！                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${GREEN}📍 服务访问地址:${NC}"
echo -e "   🌐 前端: http://$NODE1_IP:3000"
echo -e "   🔧 后端: http://$NODE1_IP:8000"
echo -e "   👨‍💼 管理后台: http://$NODE1_IP:8000/admin/"
echo -e "   📦 MinIO: http://$NODE1_IP:9001"

echo ""
echo -e "${GREEN}🔍 常用命令:${NC}"
echo -e "   查看日志: docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f"
echo -e "   重启服务: docker-compose -f infra/production/docker-compose-ha-node1.yml restart"
echo -e "   停止服务: docker-compose -f infra/production/docker-compose-ha-node1.yml down"
echo -e "   查看状态: docker-compose -f infra/production/docker-compose-ha-node1.yml ps"

echo ""
echo -e "${YELLOW}📝 下一步操作:${NC}"
echo -e "   1. 访问管理后台创建超级用户"
echo -e "   2. 配置域名和 SSL 证书"
echo -e "   3. 设置定时备份任务"
echo -e "   4. 配置监控告警"

echo ""
echo -e "${BLUE}🚀 未来升级到 HA 模式:${NC}"
echo -e "   当需要高可用时，运行: ./deploy/scripts/upgrade-to-ha.sh"
echo -e "   预计升级时间: 5-15分钟"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 单节点部署成功完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

