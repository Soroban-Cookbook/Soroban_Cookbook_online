#!/usr/bin/env bash
set -euo pipefail

# Default values
SOURCE="documentation/static/img/soroban-logo.png"
OUT="documentation/static"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2 ;;
    --out)    OUT="$2";    shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# Check source exists
if [[ ! -f "$SOURCE" ]]; then
  echo "ERROR: Source logo not found at '$SOURCE'" >&2
  echo "Usage: $0 [--source path/to/soroban-logo.png] [--out path/to/static]" >&2
  exit 1
fi

# Check required tools
MISSING_TOOLS=0

if ! command -v convert &>/dev/null; then
  echo "ERROR: 'convert' (ImageMagick) is not installed." >&2
  echo "  Install: sudo apt-get install imagemagick  OR  brew install imagemagick" >&2
  MISSING_TOOLS=1
fi

if ! npx --yes sharp-cli --version &>/dev/null 2>&1; then
  echo "ERROR: 'sharp-cli' is not available via npx." >&2
  echo "  Install: npm install -g sharp-cli  OR  cd documentation && npm install --save-dev sharp-cli" >&2
  MISSING_TOOLS=1
fi

if [[ $MISSING_TOOLS -eq 1 ]]; then
  exit 1
fi

ICONS_DIR="$OUT/img/icons"
mkdir -p "$ICONS_DIR"

echo "Generating icons from $SOURCE..."

# PNG rasterization using sharp-cli
SIZES=(16 32 48 120 152 167 180 192 512)
for SIZE in "${SIZES[@]}"; do
  case $SIZE in
    16)  OUT_FILE="$ICONS_DIR/favicon-16x16.png" ;;
    32)  OUT_FILE="$ICONS_DIR/favicon-32x32.png" ;;
    48)  OUT_FILE="$ICONS_DIR/favicon-48x48.png" ;;
    120) OUT_FILE="$ICONS_DIR/apple-touch-icon-120x120.png" ;;
    152) OUT_FILE="$ICONS_DIR/apple-touch-icon-152x152.png" ;;
    167) OUT_FILE="$ICONS_DIR/apple-touch-icon-167x167.png" ;;
    180) OUT_FILE="$ICONS_DIR/apple-touch-icon.png" ;;
    192) OUT_FILE="$ICONS_DIR/android-chrome-192x192.png" ;;
    512) OUT_FILE="$ICONS_DIR/android-chrome-512x512.png" ;;
  esac
  echo "  Generating ${SIZE}x${SIZE}: $OUT_FILE"
  npx sharp-cli --input "$SOURCE" --output "$OUT_FILE" resize "$SIZE" "$SIZE" -- fit contain -- background "{ \"r\": 0, \"g\": 0, \"b\": 0, \"alpha\": 0 }"
done

# PWA install icons (root static/img)
for SIZE in 192 512; do
  OUT_FILE="$OUT/img/pwa-icon-${SIZE}x${SIZE}.png"
  echo "  Generating PWA ${SIZE}x${SIZE}: $OUT_FILE"
  npx sharp-cli --input "$SOURCE" --output "$OUT_FILE" resize "$SIZE" "$SIZE" -- fit contain -- background "{ \"r\": 0, \"g\": 0, \"b\": 0, \"alpha\": 0 }"
done

# ICO assembly (16, 32, 48)
echo "  Assembling favicon.ico..."
convert \
  "$ICONS_DIR/favicon-16x16.png" \
  "$ICONS_DIR/favicon-32x32.png" \
  "$ICONS_DIR/favicon-48x48.png" \
  "$OUT/img/favicon.ico"

# favicon.svg — PNG sources use the Node script (embedded 32×32 raster)
if [[ "$SOURCE" == *.svg ]]; then
  echo "  Cleaning and copying favicon.svg..."
  sed \
    -e 's/<!--[^>]*-->//g' \
    -e 's/xmlns:inkscape="[^"]*"//g' \
    -e 's/xmlns:sodipodi="[^"]*"//g' \
    -e 's/<metadata[^>]*>.*<\/metadata>//g' \
    "$SOURCE" > "$OUT/img/favicon.svg"
else
  echo "  Skipping favicon.svg (run node scripts/generate-icons.js for PNG sources)."
fi

# Size check
echo ""
echo "Icon file sizes:"
TOTAL=0
ALL_FILES=(
  "$OUT/img/favicon.ico"
  "$OUT/img/favicon.svg"
  "$ICONS_DIR/favicon-16x16.png"
  "$ICONS_DIR/favicon-32x32.png"
  "$ICONS_DIR/favicon-48x48.png"
  "$ICONS_DIR/apple-touch-icon.png"
  "$ICONS_DIR/apple-touch-icon-167x167.png"
  "$ICONS_DIR/apple-touch-icon-152x152.png"
  "$ICONS_DIR/apple-touch-icon-120x120.png"
  "$ICONS_DIR/android-chrome-192x192.png"
  "$ICONS_DIR/android-chrome-512x512.png"
)
for FILE in "${ALL_FILES[@]}"; do
  if [[ -f "$FILE" ]]; then
    SIZE_BYTES=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
    TOTAL=$((TOTAL + SIZE_BYTES))
    printf "  %8d bytes  %s\n" "$SIZE_BYTES" "$FILE"
  fi
done
printf "  --------\n"
printf "  %8d bytes  total\n" "$TOTAL"

if [[ $TOTAL -ge 102400 ]]; then
  echo "WARNING: Total icon asset size ($TOTAL bytes) exceeds 100KB limit (102400 bytes)." >&2
  exit 1
fi

echo ""
echo "Done. All icons generated successfully."
