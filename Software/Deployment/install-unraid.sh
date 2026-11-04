#!/bin/sh
set -e

echo "=================================================================="
echo "  Installing BrayDashy (Sysadmin + Bri Home Hub) on Unraid"
echo "=================================================================="

APPDATA_DIR="/mnt/user/appdata/braydashy"
PROJECTS_DIR="/mnt/user/Projects/BrayDashy"
SEED_DIR="$PROJECTS_DIR/unraid-runtime/backend/seed-profiles"

echo "[1/4] Preparing appdata folders at $APPDATA_DIR ..."
mkdir -p "$APPDATA_DIR/profiles"

if [ -f "$SEED_DIR/config.json" ]; then
  cp -f "$SEED_DIR/config.json" "$APPDATA_DIR/config.json"
  echo "  -> Installed pre-configured Sysadmin config.json (18 Unraid apps)"
fi

if [ -f "$SEED_DIR/bri.json" ]; then
  cp -f "$SEED_DIR/bri.json" "$APPDATA_DIR/profiles/bri.json"
  echo "  -> Installed pre-configured Bri Home Hub profile (bri.json)"
fi

echo "[2/4] Stopping and removing old BrayDashy container (if running)..."
docker stop BrayDashy 2>/dev/null || true
docker rm BrayDashy 2>/dev/null || true
docker stop braydashy-dashboard 2>/dev/null || true
docker rm braydashy-dashboard 2>/dev/null || true

echo "[3/4] Launching new BrayDashy container linked to $PROJECTS_DIR ..."
docker run -d \
  --name="BrayDashy" \
  --restart="unless-stopped" \
  -p 3050:3050/tcp \
  -v "/mnt/user/appdata/braydashy:/app/data:rw" \
  -v "/mnt/user/Projects/BrayDashy/unraid-runtime/backend:/app/backend:rw" \
  -v "/mnt/user/Projects/BrayDashy/unraid-runtime/frontend/dist:/app/frontend/dist:rw" \
  -v "/mnt/user/Projects/BrayDashy:/local-source:rw" \
  -l net.unraid.docker.managed="dockerman" \
  -l net.unraid.docker.webui="http://[IP]:[PORT:3050]/" \
  -l net.unraid.docker.icon="https://raw.githubusercontent.com/Ruzzler/braydashy-dashboard/main/icon.png" \
  ghcr.io/ruzzler/braydashy-dashboard:latest

echo "[4/4] Done!"
echo "=================================================================="
echo "  Sysadmin Dashboard: http://192.168.0.100:3050/"
echo "  Bri's Home Hub:     http://192.168.0.100:3050/bri"
echo "=================================================================="