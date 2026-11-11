#!/bin/sh
# Run the AHK API from this repository's source inside the published vkara-api-redis image.
#
# The image ships the compiled upstream API plus its build tree (/repo with installed
# node_modules). This script downloads AHK source at AHK_SOURCE_REF, reuses those installed
# dependencies, and points /app/server at `bun run` on the new source, so server changes can
# ship without building and publishing a new image. Any failure leaves the image's own
# compiled server in place (the API still starts, just without AHK server changes).
#
#   AHK_SOURCE_REF   commit sha or branch to run (required)
#   AHK_SOURCE_REPO  owner/name on GitHub (default jdmiami/AHK)
#   AHK_SOURCE_URL   tarball URL override (default codeload.github.com)
set -u

REF="${AHK_SOURCE_REF:-}"
REPO="${AHK_SOURCE_REPO:-jdmiami/AHK}"
DEST="${AHK_SOURCE_DIR:-/tmp/ahk-src}"
URL="${AHK_SOURCE_URL:-https://codeload.github.com/${REPO}/tar.gz/${REF}}"

log() { echo "[ahk-source] $*"; }

if [ -z "$REF" ] && [ -z "${AHK_SOURCE_URL:-}" ]; then
    log "AHK_SOURCE_REF not set; using the image's compiled server"
    exit 0
fi
if [ ! -d /repo/node_modules ] || ! command -v bun >/dev/null 2>&1; then
    log "image has no /repo build tree or bun; using the image's compiled server"
    exit 0
fi

rm -rf "$DEST" && mkdir -p "$DEST"
if ! wget -qO- "$URL" | tar -xz -C "$DEST" --strip-components=1; then
    log "download failed ($URL); using the image's compiled server"
    rm -rf "$DEST"
    exit 0
fi

# Reuse installed dependencies. Workspace links are relative symlinks, so copying each
# package's node_modules makes @vkara/* resolve to the new source under $DEST.
ln -s /repo/node_modules "$DEST/node_modules"
for src in /repo/apps/api /repo/packages/*; do
    dir="${src#/repo/}"
    if [ -d "$src/node_modules" ] && [ -d "$DEST/$dir" ]; then
        # -RP: recurse and keep symlinks as links (no ownership preservation as user bun).
        cp -RP "$src/node_modules" "$DEST/$dir/"
    fi
done

cat > /app/server <<SERVER
#!/bin/sh
cd "$DEST/apps/api"
exec bun run ./src/index.ts
SERVER
chmod +x /app/server
log "running API from ${REPO}@${REF:-custom tarball}"
