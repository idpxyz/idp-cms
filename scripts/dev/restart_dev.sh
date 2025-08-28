#!/usr/bin/env bash
set -euo pipefail
docker compose -f infra/local/docker-compose.yaml -f docker-compose.override.yaml restart ${1:-authoring}
