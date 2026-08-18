#!/usr/bin/env bash
# Bump the cache-busting stamp on styles.css and scroll.js so a browser can never
# serve a stale stylesheet during iteration. Run after any CSS/JS edit.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
S=$(date +%s)
perl -pi -e "s|(href=\"styles\.css)(\?v=\d+)?\"|\$1?v=$S\"|" "$ROOT/index.html"
perl -pi -e "s|(src=\"scroll\.js)(\?v=\d+)?\"|\$1?v=$S\"|" "$ROOT/index.html"
echo "stamped assets at v=$S"
