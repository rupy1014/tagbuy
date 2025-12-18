#!/bin/bash

# TagBuy - Stop all services
# Usage: ./scripts/stop.sh [--clean]

set -e

cd "$(dirname "$0")/.."

echo "🛑 Stopping TagBuy services..."

if [ "$1" == "--clean" ]; then
    echo "🧹 Removing containers and volumes..."
    docker-compose down -v
else
    docker-compose down
fi

echo "✅ Services stopped!"
