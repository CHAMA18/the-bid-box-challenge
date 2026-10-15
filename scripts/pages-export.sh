#!/usr/bin/env bash
# GitHub Pages static export build.
#
# GitHub Pages serves files only — the server-side API handlers cannot exist
# in the Pages build. This script moves them out of the tree, runs the static
# export (next.config.ts emits `output: "export"` under STATIC_EXPORT=1), then
# restores them so the working tree is left exactly as it was.
#
# Pages components already degrade gracefully: client fetches to the fallen
# routes simply resolve to their designed idle/empty states.
set -euo pipefail
cd "$(dirname "$0")/.."

STASH_DIR=".pages-stash$$"
mkdir -p "$STASH_DIR"

cleanup() {
  # Restore any moved routes no matter how the build ends.
  if [ -d "$STASH_DIR/api" ]; then
    rsync -a "$STASH_DIR/api/" src/app/api/
    rm -rf "$STASH_DIR"
  fi
}
trap cleanup EXIT

mv src/app/api "$STASH_DIR/api"

STATIC_EXPORT=1 bunx next build
