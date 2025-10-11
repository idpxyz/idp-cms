#!/bin/bash

# =============================================================================
# 启动开发环境（使用共享基础设施）
# =============================================================================

set -e

echo "🚀 Starting Development Environment with Shared Infrastructure..."
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

# 停止现有开发环境服务
echo "🛑 Stopping existing development services..."
docker compose -f infra/local/docker-compose-shared.yml down 2>/dev/null || true

# 启动独立服务（Redis, OpenSearch）
echo "🏗️  Starting local services (Redis, OpenSearch)..."
docker compose -f infra/local/docker-compose-shared.yml up -d redis opensearch os-dashboards

# 等待服务就绪
echo "⏳ Waiting for services to be ready..."
sleep 10

# 启动应用服务
echo "📝 Starting application services..."
docker compose -f infra/local/docker-compose-shared.yml up -d authoring

echo "⏳ Waiting for authoring service..."
sleep 20

# 运行迁移
echo "🗄️  Running migrations..."
docker compose -f infra/local/docker-compose-shared.yml exec -T authoring \
  python manage.py migrate

# 创建超级用户
echo "👤 Creating superuser..."
docker compose -f infra/local/docker-compose-shared.yml exec -T authoring python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# 启动其他服务
echo "🚀 Starting remaining services..."
docker compose -f infra/local/docker-compose-shared.yml up -d

echo ""
echo "🎉 Development environment is running!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/local/docker-compose-shared.yml ps
echo ""
echo "🌐 Access URLs:"
echo "   - Frontend:    http://localhost:3001/"
echo "   - Backend:     http://localhost:8000/"
echo "   - Admin:       http://localhost:8000/admin/"
echo ""
echo "🔗 Shared Infrastructure:"
echo "   - PostgreSQL:  localhost:5432 (shared-postgres)"
echo "   - MinIO:       localhost:9000 (shared-minio)"
echo "   - ClickHouse:  localhost:8123 (shared-clickhouse)"
echo ""
echo "🔑 Default credentials:"
echo "   - Admin: admin/admin123"

