#!/usr/bin/env bash
# check-example-readmes.sh — Verify every example crate ships a README.
#
# Usage:
#   ./scripts/check-example-readmes.sh
#
# Exit codes:
#   0 — every example crate has a README.md
#   1 — one or more crates are missing one
#
# Discovery matches scripts/test-examples.sh: every immediate sub-directory of
# examples/ that contains a Cargo.toml is an example crate.

set -euo pipefail

EXAMPLES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../examples" && pwd)"
MISSING=()
CHECKED=0

if [ -t 1 ]; then
  GREEN="\033[0;32m"
  RED="\033[0;31m"
  RESET="\033[0m"
else
  GREEN=""
  RED=""
  RESET=""
fi

while IFS= read -r dir; do
  [ -f "$dir/Cargo.toml" ] || continue
  CHECKED=$((CHECKED + 1))
  if [ ! -f "$dir/README.md" ]; then
    MISSING+=("$(basename "$dir")")
  fi
done < <(find "$EXAMPLES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}[fail]${RESET} ${#MISSING[@]} of ${CHECKED} example crate(s) have no README.md:"
  for name in "${MISSING[@]}"; do
    echo "  • examples/${name}/README.md"
  done
  echo ""
  echo "Add one using the template in documentation/docs/contributing/add-tested-example.md"
  exit 1
fi

echo -e "${GREEN}[pass]${RESET} All ${CHECKED} example crates have a README.md"
