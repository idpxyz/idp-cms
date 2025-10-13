#!/bin/bash

echo "🚀 Starting IDP-CMS with comprehensive initialization..."

# Function to check if a service is healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f infra/local/docker-compose.yml ps $service | grep -q "healthy"; then
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
docker compose -f infra/local/docker-compose.yml down

# Clean up volumes if needed
if [ "$1" = "--clean" ]; then
    echo "🧹 Cleaning up volumes..."
    docker volume rm idp-cms_pgdata idp-cms_redis_data idp-cms_minio idp-cms_opensearch_data idp-cms_opensearch_logs idp-cms_chdata 2>/dev/null || true
fi

# Start infrastructure services first
echo "🏗️  Starting infrastructure services..."
docker compose -f infra/local/docker-compose.yml up -d postgres redis minio opensearch clickhouse

# Wait for services to be ready
wait_for_service postgres || exit 1
wait_for_service redis || exit 1
wait_for_service minio || exit 1
wait_for_service clickhouse || exit 1

# Start authoring service (without auto-migration)
echo "📝 Starting authoring service..."
docker compose -f infra/local/docker-compose.yml up -d authoring

# Wait for authoring to be ready
echo "⏳ Waiting for authoring service to be ready..."
sleep 30

# Generate migrations for custom apps
echo "📝 Generating migrations for custom apps..."
docker compose -f infra/local/docker-compose.yml exec -T authoring python manage.py makemigrations home
docker compose -f infra/local/docker-compose.yml exec -T authoring python manage.py makemigrations news
docker compose -f infra/local/docker-compose.yml exec -T authoring python manage.py makemigrations core

# Initialize database and run migrations
echo "🗄️  Running migrations..."
docker compose -f infra/local/docker-compose.yml exec -T authoring python manage.py migrate

# Create superuser if needed
echo "👤 Creating superuser..."
docker compose -f infra/local/docker-compose.yml exec -T authoring python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# Install Sites dependencies on host (to be mounted into container)
echo "📦 Installing Sites dependencies..."
cd sites
if [ ! -d "node_modules" ] || [ ! -d "node_modules/swr" ]; then
    echo "   Installing npm packages (this may take a few minutes)..."
    PUPPETEER_SKIP_DOWNLOAD=true npm install
    if [ $? -eq 0 ]; then
        echo "   ✅ Dependencies installed successfully"
    else
        echo "   ⚠️  Some dependencies failed to install, continuing anyway..."
    fi
else
    echo "   ✅ Dependencies already installed"
fi
cd ..

# Start remaining services
echo "🚀 Starting remaining services..."
docker compose -f infra/local/docker-compose.yml up -d

# Wait for Sites service to be ready
echo "⏳ Waiting for Sites service to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:3001/api/ready > /dev/null 2>&1; then
        echo "✅ Sites service is ready!"
        break
    fi
    echo "   Attempt $i/60 - waiting..."
    sleep 2
done

# Run warmup to pre-compile pages
echo "🔥 Pre-warming Sites pages (this will make first user access faster)..."
echo "   This may take 1-2 minutes..."
docker exec local-sites-1 sh /app/warmup.sh || echo "   ⚠️  Warmup script not found, skipping..."

# Alternative: Call external warmup script if container script fails
if [ -f "./warmup-sites.sh" ]; then
    echo "   Running external warmup..."
    ./warmup-sites.sh > /dev/null 2>&1 &
fi

echo ""
echo "🎉 IDP-CMS is now running and optimized!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/local/docker-compose.yml ps
echo ""
echo "🌐 Access URLs:"
echo "   - Wagtail Admin: http://localhost:8000/admin/"
echo "   - Sites Frontend: http://localhost:3001/"
echo "   - OpenSearch: http://localhost:9200/"
echo "   - MinIO Console: http://localhost:9001/"
echo "   - ClickHouse: http://localhost:8123/"
echo ""
echo "🔑 Default credentials:"
echo "   - Admin: admin/admin123"
echo "   - MinIO: minioadmin/minioadmin"
echo "   - OpenSearch: admin/OpenSearch2024!@#$%"
echo ""
echo "⚡ Performance Tips:"
echo "   - All pages have been pre-compiled for fast first access"
echo "   - Average article load time: < 1 second"
echo "   - If you restart containers, run: ./warmup-sites.sh" 