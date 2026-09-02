#!/usr/bin/env bash
# check-snippet-drift.sh — Detect when a Rust code fence tagged with
# `src=<path>` in documentation/docs/patterns/ differs from the
# corresponding file under examples/.
#
# Convention
# ──────────
# Any fenced Rust block that carries a `src=` attribute in its info string is
# treated as a direct copy of (or excerpt from) a file in examples/.  The
# attribute value must be a path relative to the examples/ directory:
#
#   ```rust src=counter/src/lib.rs
#   <code identical to examples/counter/src/lib.rs>
#   ```
#
# A block marked `src=` but differing from the referenced file fails this
# check.  Blocks without `src=` are ignored (they may still need a
# corresponding crate to pass check-snippets.sh, but that is a separate
# concern).
#
# Usage:
#   ./scripts/check-snippet-drift.sh                    # scan all patterns
#   ./scripts/check-snippet-drift.sh counter.mdx        # single file
#
# Exit codes:
#   0 — all tagged snippets match their source files
#   1 — one or more snippets have drifted from their source

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO_ROOT/documentation/docs/patterns"
EXAMPLES_DIR="$REPO_ROOT/examples"

PASS=0
FAIL=0
DRIFTED=()

# ── colour helpers ────────────────────────────────────────────────────────────
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

# ── argument handling ─────────────────────────────────────────────────────────
if [ $# -gt 0 ]; then
  MDX_FILES=("$DOCS_DIR/$1")
  if [ ! -f "${MDX_FILES[0]}" ]; then
    echo "ERROR: File '${1}' not found in ${DOCS_DIR}" >&2
    exit 1
  fi
else
  mapfile -t MDX_FILES < <(find "$DOCS_DIR" -maxdepth 1 -name "*.mdx" | sort)
fi

echo ""
log_info "Scanning ${#MDX_FILES[@]} file(s) for src= tagged Rust fences"
log_info "Comparing against examples in: $EXAMPLES_DIR"
echo ""

# ── per-file processing ───────────────────────────────────────────────────────
for mdx in "${MDX_FILES[@]}"; do
  basename_mdx="$(basename "$mdx")"
  found_any=0

  # Extract all `src=` values and their associated fence content.
  #
  # Strategy: read the file line-by-line through a simple state machine.
  #   state=0  → outside any fence
  #   state=1  → inside a ```rust src=... fence; accumulating body lines
  #
  # When a closing ``` is encountered in state=1, compare the accumulated
  # body with the referenced file and reset.

  in_fence=0
  src_path=""
  body=""

  while IFS= read -r line || [ -n "$line" ]; do
    if [ "$in_fence" -eq 0 ]; then
      # Opening fence: must start with ```rust and contain src=
      if [[ "$line" =~ ^\`\`\`rust[[:space:]]+src=([^[:space:]]+) ]]; then
        src_path="${BASH_REMATCH[1]}"
        in_fence=1
        body=""
      fi
    else
      # Closing fence
      if [[ "$line" =~ ^\`\`\`[[:space:]]*$ ]]; then
        in_fence=0

        # Skip empty-body fences (e.g. syntax-demo blocks in the docs themselves)
        if [ -z "$body" ]; then
          src_path=""
          continue
        fi

        found_any=1

        target_file="$EXAMPLES_DIR/$src_path"
        if [ ! -f "$target_file" ]; then
          log_fail "$basename_mdx — src=$src_path — referenced file not found: $target_file"
          DRIFTED+=("$basename_mdx (src=$src_path — file missing)")
          (( FAIL++ )) || true
          src_path=""
          body=""
          continue
        fi

        actual="$(cat "$target_file")"

        # Normalise: strip trailing whitespace from every line and drop a
        # leading/trailing blank line that editors sometimes add.
        norm_body="$(echo "$body" | sed 's/[[:space:]]*$//' | sed '/^$/d')"
        norm_actual="$(echo "$actual" | sed 's/[[:space:]]*$//' | sed '/^$/d')"

        if [ "$norm_body" = "$norm_actual" ]; then
          log_pass "$basename_mdx — src=$src_path — matches"
          (( PASS++ )) || true
        else
          log_fail "$basename_mdx — src=$src_path — DRIFTED from $target_file"
          echo ""
          echo "  Diff (snippet vs file):"
          diff <(echo "$norm_body") <(echo "$norm_actual") \
            | sed 's/^/    /' || true
          echo ""
          DRIFTED+=("$basename_mdx (src=$src_path)")
          (( FAIL++ )) || true
        fi

        src_path=""
        body=""
      else
        # Accumulate fence body (preserve internal newlines)
        if [ -n "$body" ]; then
          body="$body
$line"
        else
          body="$line"
        fi
      fi
    fi
  done < "$mdx"

  if [ "$found_any" -eq 0 ]; then
    log_skip "$basename_mdx — no src= fences found"
  fi
done

# ── summary ───────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────"
echo "Results: ${PASS} matched  |  ${FAIL} drifted"
echo "─────────────────────────────────────────────────────"

if [ "${FAIL}" -gt 0 ]; then
  echo ""
  log_fail "Drifted snippet(s) — update the MDX or the example file to re-sync:"
  for d in "${DRIFTED[@]}"; do
    echo "  • $d"
  done
  echo ""
  echo "See documentation/docs/contributing/snippet-drift.md for guidance."
  exit 1
fi

echo ""
log_pass "All src= tagged snippets are in sync with their example files."
