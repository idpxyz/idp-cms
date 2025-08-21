#!/bin/bash

echo "🚀 Starting IDP-CMS in PRODUCTION mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file from env.example and configure it for production."
    exit 1
fi

# Function to check if a service is healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f infra/production/docker-compose.yaml ps $service | grep -q "healthy"; then
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
docker compose -f infra/production/docker-compose.yaml down

# Start infrastructure services first
echo "🏗️  Starting infrastructure services..."
docker compose -f infra/production/docker-compose.yaml up -d postgres redis minio opensearch

# Wait for services to be ready
wait_for_service postgres || exit 1
wait_for_service redis || exit 1
wait_for_service minio || exit 1
wait_for_service opensearch || exit 1

# Start authoring service
echo "📝 Starting authoring service..."
docker compose -f infra/production/docker-compose.yaml up -d authoring

# Wait for authoring to be ready
echo "⏳ Waiting for authoring service to be ready..."
sleep 30

# Run migrations
echo "🗄️  Running migrations..."
docker compose -f infra/production/docker-compose.yaml exec -T authoring python authoring/manage.py migrate

# Start portal service
echo "🌐 Starting portal service..."
docker compose -f infra/production/docker-compose.yaml up -d portal

echo "🎉 IDP-CMS is now running in PRODUCTION mode!"
echo ""
echo "📊 Service Status:"
docker compose -f infra/production/docker-compose.yaml ps
echo ""
echo "🌐 Access URLs:"
echo "   - Wagtail Admin: http://localhost:8000/admin/"
echo "   - Portal: http://localhost:3000/"
echo "   - OpenSearch: http://localhost:9200/"
echo "   - MinIO Console: http://localhost:9001/"
echo ""
echo "⚠️  IMPORTANT: This is PRODUCTION mode. Make sure:"
echo "   - .env file is properly configured"
echo "   - Strong passwords are set"
echo "   - CORS and security settings are appropriate"
echo "   - Firewall rules are configured"
