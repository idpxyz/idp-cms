#!/bin/bash

echo "🚀 Starting IDP-CMS in PRODUCTION mode..."

# Check if required .env files exist
if [ ! -f .env.core ] || [ ! -f .env.production ]; then
    echo "❌ Error: Required environment files not found!"
    echo "Missing files:"
    [ ! -f .env.core ] && echo "  - .env.core"
    [ ! -f .env.production ] && echo "  - .env.production"
    echo ""
    echo "Please ensure all required .env files are configured."
    exit 1
fi

echo "✅ Environment files found:"
echo "  - .env.core"
echo "  - .env.features"
echo "  - .env.production"
echo ""

# Function to check if a service is healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f infra/production/docker-compose.yml ps $service | grep -q "healthy"; then
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
docker compose -f infra/production/docker-compose.yml down

# Start infrastructure services first
echo "🏗️  Starting infrastructure services..."
docker compose -f infra/production/docker-compose.yml up -d postgres redis minio opensearch

# Wait for services to be ready
wait_for_service postgres || exit 1
wait_for_service redis || exit 1
wait_for_service minio || exit 1
wait_for_service opensearch || exit 1

# Start authoring service
echo "📝 Starting authoring service..."
docker compose -f infra/production/docker-compose.yml up -d authoring

# Wait for authoring to be ready
echo "⏳ Waiting for authoring service to be ready..."
sleep 30

# Run migrations
echo "🗄️  Running migrations..."
docker compose -f infra/production/docker-compose.yml exec -T authoring python manage.py migrate

# Start portal service
echo "🌐 Starting portal service..."
docker compose -f infra/production/docker-compose.yml up -d portal

echo "🎉 IDP-CMS is now running in PRODUCTION mode!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/production/docker-compose.yml ps
echo ""
echo "🌐 Access URLs:"
echo "   - Wagtail Admin: http://localhost:8000/admin/"
echo "   - Sites Frontend: http://localhost:3001/"
echo "   - OpenSearch: http://localhost:9200/"
echo "   - MinIO Console: http://localhost:9001/"
echo ""
echo "⚠️  IMPORTANT: This is PRODUCTION mode. Make sure:"
echo "   - .env file is properly configured"
echo "   - Strong passwords are set"
echo "   - CORS and security settings are appropriate"
echo "   - Firewall rules are configured"
