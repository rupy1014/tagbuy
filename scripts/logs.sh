#!/bin/bash

# TagBuy - View service logs
# Usage: ./scripts/logs.sh [service_name]
# Examples:
#   ./scripts/logs.sh        # All services
#   ./scripts/logs.sh api    # API only
#   ./scripts/logs.sh frontend
#   ./scripts/logs.sh db

set -e

cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
    docker-compose logs -f
else
    docker-compose logs -f "$1"
fi
