#!/bin/bash

# TagBuy - Database migration commands
# Usage:
#   ./scripts/migrate.sh                    # Apply all migrations
#   ./scripts/migrate.sh create "message"   # Create new migration
#   ./scripts/migrate.sh downgrade          # Rollback one migration

set -e

cd "$(dirname "$0")/.."

case "$1" in
    create)
        if [ -z "$2" ]; then
            echo "❌ Please provide a migration message"
            echo "Usage: ./scripts/migrate.sh create \"your message\""
            exit 1
        fi
        echo "📝 Creating migration: $2"
        docker-compose exec api alembic revision --autogenerate -m "$2"
        ;;
    downgrade)
        echo "⬇️  Rolling back one migration..."
        docker-compose exec api alembic downgrade -1
        ;;
    *)
        echo "⬆️  Applying migrations..."
        docker-compose exec api alembic upgrade head
        ;;
esac

echo "✅ Done!"
