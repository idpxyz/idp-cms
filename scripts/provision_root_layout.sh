#!/usr/bin/env bash
set -euo pipefail
ROOT=/opt/idp-cms
USER_NAME=idp-cms
sudo useradd -r -s /usr/sbin/nologin $USER_NAME 2>/dev/null || true
sudo mkdir -p $ROOT/{app,config,data/{postgres,opensearch,clickhouse,minio,media,models},logs,runtime,backups}
if [ -f "$(pwd)/config/.env.root.example" ] && [ ! -f "$ROOT/config/.env" ]; then sudo cp "$(pwd)/config/.env.root.example" "$ROOT/config/.env"; fi
sudo chown -R $USER_NAME:$USER_NAME $ROOT
sudo chmod 750 $ROOT/config
sudo chmod 640 $ROOT/config/.env || true
echo "Layout prepared under $ROOT"
