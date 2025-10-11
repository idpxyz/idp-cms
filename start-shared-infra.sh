#!/bin/bash

# =============================================================================
# 启动共享基础设施服务
# =============================================================================
# 这些服务会被所有环境（开发、生产）共同使用

set -e

echo "🚀 Starting shared infrastructure services..."
echo ""

# 检查共享网络是否存在
if docker network inspect idp-shared-network >/dev/null 2>&1; then
    echo "✅ Shared network already exists"
else
    echo "🔧 Creating shared network..."
    docker network create idp-shared-network
fi

# 启动共享基础设施
echo "🏗️  Starting shared services..."
docker compose -f infra/shared/docker-compose.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ Shared infrastructure is running!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/shared/docker-compose.yml ps
echo ""
echo "🌐 Shared Services:"
echo "   - PostgreSQL:  localhost:5432"
echo "   - MinIO API:   localhost:9000"
echo "   - MinIO Console: localhost:9001"
echo "   - ClickHouse:  localhost:8123"
echo ""
echo "🔑 Default credentials:"
echo "   - PostgreSQL: news/news"
echo "   - MinIO: minioadmin/minioadmin"
echo "   - ClickHouse: default/thends"

