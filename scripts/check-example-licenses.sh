#!/usr/bin/env bash
# check-example-licenses.sh — Verify example crates declare a `license` field in
# their Cargo.toml and that example Rust sources carry an
# `SPDX-License-Identifier` header.
#
# Phased rollout: by default only manifests and Rust sources added or modified
# relative to the base branch are checked, so pre-existing gaps don't block
# unrelated PRs while new and touched files must comply. Pass `--all` to audit
# every example file.
#
# Usage:
#   ./scripts/check-example-licenses.sh                 # changed files vs origin/main
#   ./scripts/check-example-licenses.sh <base-ref>      # changed files vs a specific ref
#   ./scripts/check-example-licenses.sh --all           # every example file
#
# Exit codes:
#   0 — every checked file complies
#   1 — one or more manifests lack `license` or sources lack an SPDX header

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Colours
if [ -t 1 ]; then
  RED="\033[0;31m"; GREEN="\033[0;32m"; RESET="\033[0m"
else
  RED=""; GREEN=""; RESET=""
fi

FILES=()
if [ "${1:-}" = "--all" ]; then
  while IFS= read -r f; do
    FILES+=("$f")
  done < <(find examples -path '*/target' -prune -o -type f \( -name Cargo.toml -o -name '*.rs' \) -print | sort)
else
  BASE_REF="${1:-origin/main}"
  if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
    BASE_COMMIT="$(git merge-base "$BASE_REF" HEAD)"
  else
    echo "ERROR: base ref '${BASE_REF}' not found." >&2
    exit 1
  fi
  while IFS= read -r f; do
    case "$f" in
      */target/*) continue ;;
      examples/*Cargo.toml|examples/*.rs) [ -f "$f" ] && FILES+=("$f") ;;
    esac
  done < <(git diff --name-only --diff-filter=AM "$BASE_COMMIT" -- examples)
fi

MISSING_LICENSE=()
MISSING_SPDX=()
CHECKED=0

for f in "${FILES[@]+"${FILES[@]}"}"; do
  case "$f" in
    examples/Cargo.toml) continue ;; # workspace root, not a crate
    *Cargo.toml)
      CHECKED=$((CHECKED + 1))
      # Accepts `license = "..."`, `license.workspace = true`, or `license-file`.
      grep -Eq '^license(-file)?(\.workspace)?[[:space:]]*=' "$f" || MISSING_LICENSE+=("$f")
      ;;
    *.rs)
      CHECKED=$((CHECKED + 1))
      head -n 5 "$f" | grep -q 'SPDX-License-Identifier:' || MISSING_SPDX+=("$f")
      ;;
  esac
done

if [ ${#MISSING_LICENSE[@]} -gt 0 ]; then
  echo -e "${RED}[fail]${RESET} ${#MISSING_LICENSE[@]} example manifest(s) have no \`license\` field:"
  for f in "${MISSING_LICENSE[@]}"; do
    echo "  • ${f}"
  done
  echo ""
fi

if [ ${#MISSING_SPDX[@]} -gt 0 ]; then
  echo -e "${RED}[fail]${RESET} ${#MISSING_SPDX[@]} example Rust source(s) have no SPDX-License-Identifier header:"
  for f in "${MISSING_SPDX[@]}"; do
    echo "  • ${f}"
  done
  echo ""
fi

if [ ${#MISSING_LICENSE[@]} -gt 0 ] || [ ${#MISSING_SPDX[@]} -gt 0 ]; then
  echo "Add \`license = \"MIT\"\` under [package] and \`// SPDX-License-Identifier: MIT\` as the first line of each source."
  exit 1
fi

echo -e "${GREEN}[pass]${RESET} License metadata and SPDX headers present (checked ${CHECKED} example file(s))"
