#!/bin/bash

echo "🚀 Starting IDP-CMS with comprehensive initialization..."

# Function to check if a service is healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f infra/local/docker-compose.yaml ps $service | grep -q "healthy"; then
            echo "✅ $service is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to become ready after $max_attempts attempts"
    return 1
}

# Stop any existing services
echo "🛑 Stopping existing services..."
docker compose -f infra/local/docker-compose.yaml down

# Clean up volumes if needed
if [ "$1" = "--clean" ]; then
    echo "🧹 Cleaning up volumes..."
    docker volume rm idp-cms_pgdata idp-cms_redis_data idp-cms_minio idp-cms_opensearch_data idp-cms_opensearch_logs idp-cms_chdata 2>/dev/null || true
fi

# Start infrastructure services first
echo "🏗️  Starting infrastructure services..."
docker compose -f infra/local/docker-compose.yaml up -d postgres redis minio opensearch clickhouse

# Wait for services to be ready
wait_for_service postgres || exit 1
wait_for_service redis || exit 1
wait_for_service minio || exit 1
wait_for_service clickhouse || exit 1

# Start authoring service (without auto-migration)
echo "📝 Starting authoring service..."
docker compose -f infra/local/docker-compose.yaml up -d authoring

# Wait for authoring to be ready
echo "⏳ Waiting for authoring service to be ready..."
sleep 30

# Generate migrations for custom apps
echo "📝 Generating migrations for custom apps..."
docker compose -f infra/local/docker-compose.yaml exec -T authoring python authoring/manage.py makemigrations home
docker compose -f infra/local/docker-compose.yaml exec -T authoring python authoring/manage.py makemigrations news
docker compose -f infra/local/docker-compose.yaml exec -T authoring python authoring/manage.py makemigrations core

# Initialize database and run migrations
echo "🗄️  Running migrations..."
docker compose -f infra/local/docker-compose.yaml exec -T authoring python authoring/manage.py migrate

# Create superuser if needed
echo "👤 Creating superuser..."
docker compose -f infra/local/docker-compose.yaml exec -T authoring python authoring/manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# Start remaining services
echo "🚀 Starting remaining services..."
docker compose -f infra/local/docker-compose.yaml up -d

echo "🎉 IDP-CMS is now running!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/local/docker-compose.yaml ps
echo ""
echo "🌐 Access URLs:"
echo "   - Wagtail Admin: http://localhost:8000/admin/"
echo "   - Portal: http://localhost:3000/"
echo "   - OpenSearch: http://localhost:9200/"
echo "   - MinIO Console: http://localhost:9001/"
echo "   - ClickHouse: http://localhost:8123/"
echo ""
echo "🔑 Default credentials:"
echo "   - Admin: admin/admin123"
echo "   - MinIO: minioadmin/minioadmin"
echo "   - OpenSearch: admin/OpenSearch2024!@#$%" 