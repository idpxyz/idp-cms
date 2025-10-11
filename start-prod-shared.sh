#!/bin/bash

# =============================================================================
# 启动生产环境（使用共享基础设施）
# =============================================================================

set -e

echo "🚀 Starting Production Environment with Shared Infrastructure..."
echo ""

# 检查共享基础设施是否运行
echo "🔍 Checking shared infrastructure..."
if ! docker ps | grep -q "shared-postgres"; then
    echo "❌ Shared infrastructure not running!"
    echo "Please start it first:"
    echo "  ./start-shared-infra.sh"
    echo ""
    exit 1
fi

echo "✅ Shared infrastructure is running"
echo ""

# 检查生产数据库是否存在
echo "🔍 Checking production database..."
DB_EXISTS=$(docker compose -f infra/shared/docker-compose.yml exec -T postgres \
  psql -U news -lqt | cut -d \| -f 1 | grep -w news_prod | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📝 Creating production database..."
    docker compose -f infra/shared/docker-compose.yml exec -T postgres \
      psql -U news -c "CREATE DATABASE news_prod;"
    echo "✅ Production database created"
else
    echo "✅ Production database exists"
fi
echo ""

# 停止现有生产环境服务
echo "🛑 Stopping existing production services..."
docker compose -f infra/production/docker-compose-shared.yml down 2>/dev/null || true

# 启动独立服务（Redis, OpenSearch）
echo "🏗️  Starting production services (Redis, OpenSearch)..."
docker compose -f infra/production/docker-compose-shared.yml up -d redis opensearch

# 等待服务就绪
echo "⏳ Waiting for services to be ready..."
sleep 10

# 启动应用服务
echo "📝 Starting application services..."
docker compose -f infra/production/docker-compose-shared.yml up -d authoring

echo "⏳ Waiting for authoring service..."
sleep 20

# 运行迁移
echo "🗄️  Running migrations..."
docker compose -f infra/production/docker-compose-shared.yml exec -T authoring \
  python manage.py migrate

# 启动其他服务
echo "🚀 Starting remaining services..."
docker compose -f infra/production/docker-compose-shared.yml up -d

echo ""
echo "🎉 Production environment is running!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/production/docker-compose-shared.yml ps
echo ""
echo "🌐 Access URLs:"
echo "   - Frontend:    http://localhost:3002/"
echo "   - Backend:     http://localhost:8001/"
echo "   - Admin:       http://localhost:8001/admin/"
echo ""
echo "🔗 Shared Infrastructure:"
echo "   - PostgreSQL:  localhost:5432 (shared-postgres, DB: news_prod)"
echo "   - MinIO:       localhost:9000 (shared-minio)"
echo "   - ClickHouse:  localhost:8123 (shared-clickhouse)"
echo ""
echo "⚠️  Remember to configure production secrets in .env.production"

