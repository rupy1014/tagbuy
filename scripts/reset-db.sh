#!/bin/bash

# TagBuy - Reset database (WARNING: Deletes all data!)
# Usage: ./scripts/reset-db.sh

set -e

cd "$(dirname "$0")/.."

echo "⚠️  WARNING: This will delete all database data!"
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

echo "🗑️  Stopping services and removing database volume..."
docker-compose down -v

echo "🚀 Restarting services..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

echo "📦 Running migrations..."
docker-compose exec api alembic upgrade head

echo "✅ Database reset complete!"
