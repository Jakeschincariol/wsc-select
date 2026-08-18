#!/usr/bin/env bash
# Fetch a free typeface into ./fonts as self-hosted woff2.
#
#   tools/getfont.sh google "Bricolage Grotesque" "opsz,wdth,wght@12..96,75..100,200..800"
#   tools/getfont.sh google "Newsreader" "wght@400;600"
#   tools/getfont.sh fontshare satoshi
#
# Google: pulls only the `latin` subset block (the last src in the css) so we get one
# file per request, variable when an axis range is given.
# Fontshare: pulls the family zip and keeps the woff2s.
set -euo pipefail

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/fonts"
mkdir -p "$OUT"

slug() { echo "$1" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/-*$//'; }

case "${1:-}" in
  google)
    FAM="${2:?family name required}"; AXES="${3:-wght@400}"
    Q=$(echo "$FAM" | tr ' ' '+')
    URL="https://fonts.googleapis.com/css2?family=${Q}:${AXES}&display=swap"
    CSS=$(curl -sL -A "$UA" "$URL")
    if echo "$CSS" | grep -qi "not found\|400\. That’s an error"; then
      echo "FAIL  $FAM — not on Google Fonts, or bad axis spec" >&2; exit 1
    fi
    # the latin block is emitted last by the css2 API
    FILE=$(echo "$CSS" | grep -o 'https://[^)]*\.woff2' | tail -1)
    [ -z "$FILE" ] && { echo "FAIL  $FAM — no woff2 in response" >&2; exit 1; }
    DEST="$OUT/$(slug "$FAM").woff2"
    curl -sL -A "$UA" "$FILE" -o "$DEST"
    head -c4 "$DEST" | grep -q wOF2 || { echo "FAIL  $FAM — not a woff2" >&2; rm -f "$DEST"; exit 1; }
    printf 'OK    %-28s %6sK  %s\n' "$(basename "$DEST")" "$(( $(wc -c <"$DEST") / 1024 ))" \
      "$(echo "$CSS" | grep -o 'font-weight: [^;]*' | head -1)"
    ;;
  fontshare)
    FAM="${2:?family slug required}"
    TMP=$(mktemp -d)
    curl -sL -A "$UA" "https://api.fontshare.com/v2/fonts/download/${FAM}" -o "$TMP/f.zip"
    unzip -qo "$TMP/f.zip" -d "$TMP" 2>/dev/null || { echo "FAIL  $FAM — no Fontshare zip" >&2; exit 1; }
    N=0
    while IFS= read -r f; do cp "$f" "$OUT/$(basename "$f")"; N=$((N+1)); done \
      < <(find "$TMP" -iname '*.woff2' -type f)
    rm -rf "$TMP"
    [ "$N" -eq 0 ] && { echo "FAIL  $FAM — zip had no woff2" >&2; exit 1; }
    echo "OK    fontshare/$FAM — $N woff2 files"
    ;;
  *)
    echo "usage: getfont.sh google \"Family Name\" \"axes\" | getfont.sh fontshare family-slug" >&2
    exit 2
    ;;
esac
