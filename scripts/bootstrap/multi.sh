#!/usr/bin/env bash
set -euo pipefail

# Location hint: run from repo root, or set COMPOSE_FILES
COMPOSE_FILES="${COMPOSE_FILES:- -f infra/local/docker-compose.yaml }"
CMD="docker compose ${COMPOSE_FILES} exec authoring python authoring/manage.py bootstrap_sites"

function info(){ echo -e "\033[1;34m[INFO]\033[0m $*"; }
function die(){ echo -e "\033[1;31m[ERR ]\033[0m $*" >&2; exit 1; }
PORTAL="${PORTAL:-portal.local:8000}"
A_DOMAIN="${A_DOMAIN:-site-a.local:8000}"
B_DOMAIN="${B_DOMAIN:-site-b.local:8000}"
NAME="${NAME:-News}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Passw0rd!}"
DEFAULT_FLAG="${DEFAULT_FLAG:---default}"  # set "" to disable

[[ -z "$PORTAL" ]] && die "PORTAL is required (e.g., portal.local:8000)"
[[ -z "$A_DOMAIN" ]] && die "A_DOMAIN is required (e.g., site-a.local:8000)"
[[ -z "$B_DOMAIN" ]] && die "B_DOMAIN is required (e.g., site-b.local:8000)"

info "Creating Multi mode: Portal=$PORTAL, A=$A_DOMAIN, B=$B_DOMAIN, Name Prefix=$NAME"
$CMD --portal-domain="$PORTAL" --a-domain="$A_DOMAIN" --b-domain="$B_DOMAIN" --name="$NAME"   ${ADMIN_EMAIL:+--admin-email "$ADMIN_EMAIL"}   ${ADMIN_PASSWORD:+--admin-password "$ADMIN_PASSWORD"}   ${DEFAULT_FLAG}
