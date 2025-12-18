#!/bin/bash

# TagBuy - Open shell in container
# Usage:
#   ./scripts/shell.sh api       # API container
#   ./scripts/shell.sh frontend  # Frontend container
#   ./scripts/shell.sh db        # PostgreSQL psql

set -e

cd "$(dirname "$0")/.."

case "$1" in
    api)
        echo "🐍 Opening Python shell in API container..."
        docker-compose exec api python
        ;;
    frontend)
        echo "📦 Opening shell in Frontend container..."
        docker-compose exec frontend sh
        ;;
    db)
        echo "🐘 Opening PostgreSQL shell..."
        docker-compose exec db psql -U postgres -d tagbuy
        ;;
    *)
        echo "Usage: ./scripts/shell.sh [api|frontend|db]"
        exit 1
        ;;
esac
