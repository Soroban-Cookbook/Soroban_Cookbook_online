#!/usr/bin/env bash
# check-snippets.sh — Audit MDX files for Rust code blocks and verify each is
# either backed by a tested example in examples/ or explicitly marked
# illustrative with the `illustrative` info string.
#
# Usage:
#   ./scripts/check-snippets.sh
#
# Exit codes:
#   0 — all rust blocks are either tested or marked illustrative
#   1 — one or more rust blocks are unverified

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO_ROOT/documentation/docs/patterns"
EXAMPLES_DIR="$REPO_ROOT/examples"

PASS=0
FAIL=0
ILLUSTRATIVE=0
UNVERIFIED=()

# Colours
if [ -t 1 ]; then
  GREEN="\033[0;32m"
  RED="\033[0;31m"
  YELLOW="\033[0;33m"
  CYAN="\033[0;36m"
  RESET="\033[0m"
else
  GREEN="" RED="" YELLOW="" CYAN="" RESET=""
fi

log_info()  { echo -e "${YELLOW}[info]${RESET}  $*"; }
log_pass()  { echo -e "${GREEN}[pass]${RESET}  $*"; }
log_fail()  { echo -e "${RED}[fail]${RESET}  $*"; }
log_skip()  { echo -e "${CYAN}[skip]${RESET}  $*"; }

echo ""
log_info "Scanning MDX files in: $DOCS_DIR"
log_info "Checking against examples in: $EXAMPLES_DIR"
echo ""

for mdx in "$DOCS_DIR"/*.mdx; do
  filename="$(basename "$mdx" .mdx)"
  rust_blocks=$(grep -c '```rust' "$mdx" 2>/dev/null || true)
  illustrative_blocks=$(grep -c '```rust illustrative' "$mdx" 2>/dev/null || true)

  [ "$rust_blocks" -eq 0 ] && continue

  tested_blocks=$(( rust_blocks - illustrative_blocks ))

  echo -e "${YELLOW}──${RESET} $filename.mdx  (${rust_blocks} rust block(s), ${illustrative_blocks} illustrative)"

  # Check if a matching example exists
  if [ -d "$EXAMPLES_DIR/$filename" ] && [ -f "$EXAMPLES_DIR/$filename/Cargo.toml" ]; then
    log_pass "$filename — matched to examples/$filename"
    (( PASS++ )) || true
  elif [ "$illustrative_blocks" -eq "$rust_blocks" ]; then
    log_skip "$filename — all blocks marked illustrative"
    (( ILLUSTRATIVE++ )) || true
  else
    log_fail "$filename — $tested_blocks block(s) have no matching example and are not marked illustrative"
    UNVERIFIED+=("$filename")
    (( FAIL++ )) || true
  fi

  echo ""
done

echo "─────────────────────────────────────────────────────"
echo "Results: ${PASS} tested  |  ${ILLUSTRATIVE} illustrative  |  ${FAIL} unverified"
echo "─────────────────────────────────────────────────────"

if [ "${FAIL}" -gt 0 ]; then
  echo ""
  log_fail "Unverified MDX files (add a tested example or mark blocks as \`\`\`rust illustrative):"
  for f in "${UNVERIFIED[@]}"; do
    echo "  • documentation/docs/patterns/$f.mdx"
  done
  echo ""
  echo "See documentation/docs/contributing/add-tested-example.md for guidance."
  exit 1
fi

echo ""
log_pass "All rust blocks are tested or marked illustrative."
