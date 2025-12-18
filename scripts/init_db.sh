#!/bin/bash
set -e

echo "=== TagBuy Database Initialization ==="

# Wait for database
echo "Waiting for database..."
until pg_isready -h db -U postgres; do
    echo "  Database not ready, waiting..."
    sleep 2
done
echo "Database is ready!"

# Run migrations
echo "Running migrations..."
cd /app
alembic upgrade head
echo "Migrations complete!"

# Seed data if JSON file exists
if [ -f "/app/data/tagby_all_influencers.json" ]; then
    echo "Seeding influencer data..."
    python /app/scripts/seed_influencers.py \
        --json-path /app/data/tagby_all_influencers.json \
        --database-url "$DATABASE_URL"
    echo "Seeding complete!"
else
    echo "No seed data file found, skipping..."
fi

echo "=== Initialization Complete ==="
