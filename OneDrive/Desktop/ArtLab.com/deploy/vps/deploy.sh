#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "deploy/vps/.env.compose" ]]; then
  echo "Missing deploy/vps/.env.compose"
  exit 1
fi

if [[ ! -f "deploy/vps/.env.backend" ]]; then
  echo "Missing deploy/vps/.env.backend"
  exit 1
fi

docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml pull || true
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml up -d --build
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml ps
