#!/usr/bin/env bash
set -euo pipefail

# Location hint: run from repo root, or set COMPOSE_FILES
COMPOSE_FILES="${COMPOSE_FILES:- -f infra/local/docker-compose.yaml }"
CMD="docker compose ${COMPOSE_FILES} exec authoring python authoring/manage.py bootstrap_sites"

function info(){ echo -e "\033[1;34m[INFO]\033[0m $*"; }
function die(){ echo -e "\033[1;31m[ERR ]\033[0m $*" >&2; exit 1; }
PORTAL="${PORTAL:-portal.local:8000}"
PORTAL_NAME="${PORTAL_NAME:-Portal}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Passw0rd!}"
DEFAULT_FLAG="${DEFAULT_FLAG:---default}"  # set "" to disable

[[ -z "$PORTAL" ]] && die "PORTAL is required (e.g., portal.local:8000)"

info "Creating Portal only: $PORTAL (${PORTAL_NAME})"
$CMD --portal-only --portal-domain="$PORTAL" --portal-name="$PORTAL_NAME"   ${ADMIN_EMAIL:+--admin-email "$ADMIN_EMAIL"}   ${ADMIN_PASSWORD:+--admin-password "$ADMIN_PASSWORD"}   ${DEFAULT_FLAG}
