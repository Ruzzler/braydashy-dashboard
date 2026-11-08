#!/bin/bash
# BrayDashy: move the live container onto a Forgejo release (written 2026-11-07).
# Paste into the Unraid web terminal (there is no SSH). Safe to re-run.
#
#   TAG=v0.9.3 bash <(curl -fsSL http://192.168.0.100:3300/home/braydashy/raw/branch/dev/Software/Deployment/unraid-cutover.sh)
#
# What it does:
#   1. Backs up `docker inspect`, appdata/braydashy and the Unraid template to
#      /mnt/user/appdata/braydashy-backups/<time>/.
#   2. Downloads braydashy-$TAG.tar.gz from the Forgejo release, checks its sha256 and unpacks
#      it to /mnt/user/Projects/deploy/braydashy/releases/$TAG (= W:\deploy\braydashy).
#   3. Stops the old container and keeps it as BrayDashy-old, then starts BrayDashy with the
#      same image, env and port, mounting only appdata and the deploy folder, running
#      `node /app/deploy/run.js`.
#   4. Waits for the page and the version check to answer with $TAG. If they do not within
#      60 s it puts the old container back by itself.
#   5. Writes the matching Unraid template so "Edit" in the Docker tab shows the new layout.
# Rollback later: docker rm -f BrayDashy && docker rename BrayDashy-old BrayDashy && docker start BrayDashy

set -euo pipefail
TAG="${TAG:?set TAG, e.g. TAG=v0.9.3}"
NAME=BrayDashy
FJ=http://192.168.0.100:3300/home/braydashy
DEPLOY=/mnt/user/Projects/deploy/braydashy
OLD_DIST=/mnt/user/Projects/BrayDashy/unraid-runtime/frontend/dist
TPL=/boot/config/plugins/dockerMan/templates-user/my-BrayDashy.xml
BK=/mnt/user/appdata/braydashy-backups/$(date +%Y%m%d-%H%M%S)

say() { echo "== $*"; }

docker inspect "$NAME" >/dev/null || { echo "no container named $NAME"; exit 1; }
if docker inspect "$NAME-old" >/dev/null 2>&1; then
  echo "$NAME-old already exists (an earlier cutover). Remove it first if that one is done:"
  echo "  docker rm $NAME-old"
  exit 1
fi

say "1/5 backup to $BK"
mkdir -p "$BK"
docker inspect "$NAME" > "$BK/docker-inspect.json"
tar -czf "$BK/appdata-braydashy.tgz" -C /mnt/user/appdata braydashy
[ -f "$TPL" ] && cp "$TPL" "$BK/"
IMG=$(docker inspect -f '{{.Image}}' "$NAME")
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$NAME" | grep -v '^$' > "$BK/env.list"
echo "$IMG" > "$BK/image-id.txt"
docker exec "$NAME" sh -c 'command -v tar >/dev/null' || { echo "image has no tar; the in-app updater needs it"; exit 1; }

say "2/5 release $TAG"
mkdir -p "$DEPLOY/releases" "$DEPLOY/.incoming"
cd "$DEPLOY/.incoming"
curl -fsSL -o bundle.tgz "$FJ/releases/download/$TAG/braydashy-$TAG.tar.gz"
curl -fsSL -o bundle.sha256 "$FJ/releases/download/$TAG/braydashy-$TAG.tar.gz.sha256"
[ "$(sha256sum bundle.tgz | cut -d' ' -f1)" = "$(cut -d' ' -f1 bundle.sha256)" ] || { echo "checksum mismatch"; exit 1; }
rm -rf "$DEPLOY/releases/$TAG.partial"; mkdir "$DEPLOY/releases/$TAG.partial"
tar -xzf bundle.tgz -C "$DEPLOY/releases/$TAG.partial"
grep -q "\"tag\": \"$TAG\"" "$DEPLOY/releases/$TAG.partial/backend/version.json" || { echo "bundle is not $TAG"; exit 1; }
# Old hashed scripts too, so an open tab or cached page can still load.
[ -d "$OLD_DIST/assets" ] && cp -n "$OLD_DIST/assets/"* "$DEPLOY/releases/$TAG.partial/frontend/dist/assets/" || true
rm -rf "$DEPLOY/releases/$TAG"; mv "$DEPLOY/releases/$TAG.partial" "$DEPLOY/releases/$TAG"
rm -f bundle.tgz bundle.sha256
cp "$DEPLOY/releases/$TAG/run.js" "$DEPLOY/run.js"
printf '{\n  "tag": "%s",\n  "previous": "",\n  "switchedAt": "%s",\n  "switchedBy": "unraid-cutover.sh"\n}\n' "$TAG" "$(date -Iseconds)" > "$DEPLOY/current.json"
rm -f "$DEPLOY/boot.json"
echo "DEPLOY COPY - written by unraid-cutover.sh and the app's updater. Never edit by hand. Source: $FJ" > "$DEPLOY/DEPLOY-COPY-DO-NOT-EDIT.txt"

say "3/5 swap container (page is down for a few seconds)"
docker stop "$NAME" >/dev/null
docker rename "$NAME" "$NAME-old"
docker run -d --name="$NAME" --restart=unless-stopped \
  --env-file "$BK/env.list" \
  -p 3050:3050/tcp \
  -v /mnt/user/appdata/braydashy:/app/data:rw \
  -v "$DEPLOY":/app/deploy:rw \
  -l net.unraid.docker.managed=dockerman \
  -l 'net.unraid.docker.webui=http://[IP]:[PORT:3050]/' \
  -l net.unraid.docker.icon=https://raw.githubusercontent.com/Ruzzler/braydashy-dashboard/main/icon.png \
  "$IMG" node /app/deploy/run.js >/dev/null

say "4/5 health check"
ok=0
for _ in $(seq 1 30); do
  sleep 2
  if curl -fs -m 3 http://127.0.0.1:3050/api/version/check | grep -q "\"currentTag\":\"$TAG\"" &&
     curl -fs -m 3 -o /dev/null http://127.0.0.1:3050/bri; then ok=1; break; fi
done
if [ "$ok" != 1 ]; then
  echo "!! new container did not come up; putting the old one back"
  docker logs --tail 40 "$NAME" || true
  docker rm -f "$NAME" >/dev/null
  docker rename "$NAME-old" "$NAME"
  docker start "$NAME" >/dev/null
  exit 1
fi
curl -fs http://127.0.0.1:3050/api/version/check; echo

say "5/5 Unraid template"
if curl -fsSL -o "$BK/new-template.xml" "$FJ/raw/tag/$TAG/Software/Deployment/unraid-template.xml"; then
  cp "$BK/new-template.xml" "$TPL"
fi

say "DONE: $NAME runs $TAG from $DEPLOY. Old container kept stopped as $NAME-old; backup in $BK"
