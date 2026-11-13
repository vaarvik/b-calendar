#!/bin/sh
# Starts the app as `node`. A volume mounted at MEDIA_DIR may be owned by root (no fsGroup on the
# pod); started as root, the folder is handed to `node` first, then root is dropped.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$MEDIA_DIR"
  chown node:node "$MEDIA_DIR"
  exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi
# Migrate to the latest schema, then serve. Migrations are idempotent and one copy runs.
node dist/src/migrate.js
exec node dist/src/server.js
