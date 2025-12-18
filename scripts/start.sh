#!/bin/bash

# TagBuy - Start all services
# Usage: ./scripts/start.sh [--build]

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting TagBuy services..."

if [ "$1" == "--build" ]; then
    echo "📦 Building containers..."
    docker-compose up -d --build
else
    docker-compose up -d
fi

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Access points:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   PostgreSQL: localhost:5432"
echo "   Redis:      localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     ./scripts/logs.sh"
echo "   Stop services: ./scripts/stop.sh"
