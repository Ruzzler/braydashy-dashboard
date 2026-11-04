#!/bin/sh
set -e

echo "=================================================================="
echo "  Installing Forgejo (Self-Hosted Git + Container Registry)"
echo "=================================================================="

APPDATA_DIR="/mnt/user/appdata/forgejo"
REPOS_DIR="/mnt/user/Projects/forgejo-repos"

echo "[1/3] Creating Forgejo directories..."
mkdir -p "$APPDATA_DIR"
mkdir -p "$REPOS_DIR"

echo "[2/3] Removing any previous Forgejo container..."
docker stop Forgejo 2>/dev/null || true
docker rm Forgejo 2>/dev/null || true

echo "[3/3] Pulling and starting Forgejo on port 3300..."
docker run -d \
  --name="Forgejo" \
  --restart="unless-stopped" \
  -e USER_UID=99 \
  -e USER_GID=100 \
  -e FORGEJO__server__ROOT_URL="http://192.168.0.100:3300/" \
  -e FORGEJO__server__HTTP_PORT="3000" \
  -e FORGEJO__server__SSH_DOMAIN="192.168.0.100" \
  -e FORGEJO__server__SSH_PORT="2222" \
  -e FORGEJO__database__DB_TYPE="sqlite3" \
  -e FORGEJO__repository__ROOT="/data/git/repositories" \
  -e FORGEJO__packages__ENABLED="true" \
  -p 3300:3000/tcp \
  -p 2222:22/tcp \
  -v "/mnt/user/appdata/forgejo:/data:rw" \
  -v "/mnt/user/Projects/forgejo-repos:/data/git/repositories:rw" \
  -v "/etc/localtime:/etc/localtime:ro" \
  -l net.unraid.docker.managed="dockerman" \
  -l net.unraid.docker.webui="http://[IP]:[PORT:3300]/" \
  -l net.unraid.docker.icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/forgejo.png" \
  codeberg.org/forgejo/forgejo:9

echo "=================================================================="
echo "  Forgejo is starting!"
echo "  WebUI: http://192.168.0.100:3300/"
echo "  Git Repos Stored In: /mnt/user/Projects/forgejo-repos"
echo "=================================================================="