#!/usr/bin/env bash
# Deploy strategy.angra.io from git (run on server as root).
set -euo pipefail

ROOT="/var/www/strategy.angra.io"
REPO="${STRATEGY_REPO:-https://github.com/alceupassos/strategy.git}"
WORKDIR="/tmp/strategy-deploy-$$"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

git clone --depth 1 "$REPO" "$WORKDIR"
rsync -a --delete \
  --exclude '.env.local' \
  --exclude '.omx/' \
  --exclude '.git/' \
  "$WORKDIR/" "$ROOT/"

if [[ -f "$ROOT/.env.local" ]]; then
  echo "Keeping existing $ROOT/.env.local"
fi

cd "$ROOT"
pm2 restart strategy || PORT=3026 HOSTNAME=127.0.0.1 pm2 start server.js --name strategy --cwd "$ROOT"
pm2 save
nginx -t
systemctl reload nginx
echo "Deploy OK: $ROOT"
