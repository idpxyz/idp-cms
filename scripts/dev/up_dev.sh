#!/usr/bin/env bash
set -euo pipefail
export DEV_UID=${DEV_UID:-$(id -u)}
export DEV_GID=${DEV_GID:-$(id -g)}
echo "Using DEV_UID=$DEV_UID DEV_GID=$DEV_GID"
docker compose -f infra/local/docker-compose.yaml -f docker-compose.override.yaml up -d --build
