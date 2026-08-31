#!/usr/bin/env bash
# forbid-unwrap.sh — Forbid new `.unwrap()`/`.expect(` calls in example contract
# code that is NOT inside a `#[cfg(test)]` module.
#
# Existing occurrences are not flagged (they are tracked separately as technical
# debt under Phase 8 #636 — "gradually fix existing"). Only lines newly added
# relative to the base branch are checked, so this enforces "no new unwraps"
# without breaking the build on pre-existing code.
#
# Test code (anything under `#[cfg(test)]`) is always allowed.
#
# Usage:
#   ./scripts/forbid-unwrap.sh                 # check against origin/main
#   ./scripts/forbid-unwrap.sh <base-ref>      # check against a specific ref
#
# Exit codes:
#   0 — no new unwrap/expect outside test modules
#   1 — one or more new unwrap/expect found outside test modules

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLES_DIR="${REPO_ROOT}/examples"
cd "$REPO_ROOT"

BASE_REF="${1:-origin/main}"

# Resolve the base commit to diff against (merge-base keeps fork PRs honest).
if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  BASE_COMMIT="$(git merge-base "$BASE_REF" HEAD)"
else
  echo "ERROR: base ref '${BASE_REF}' not found." >&2
  exit 1
fi

# Colours
if [ -t 1 ]; then
  RED="\033[0;31m"; YELLOW="\033[0;33m"; GREEN="\033[0;32m"; RESET="\033[0m"
else
  RED=""; YELLOW=""; GREEN=""; RESET=""
fi

# ── awk: classify each line of a lib.rs as inside/outside test scope ───────────
# Tracks `#[cfg(test)]` blocks (which may be preceded by attribute chains such as
# `#[cfg(test)]` / `#[contract]` / `#[contractimpl]`) and reports, for the
# requested target line numbers, whether they fall inside a test module.
read -r -d '' CLASSIFY_AWK <<'AWK' || true
BEGIN {
  if (targets_csv != "") {
    n = split(targets_csv, parts, ",")
    for (k = 1; k <= n; k++) {
      nr = parts[k] + 0
      tgt[k] = nr
      target[nr] = 1
    }
  }
}

{
  raw = $0

  # Spot a `#[cfg(test)]` attribute and arm "pending" until its block opens.
  if (raw ~ /#\[cfg\(test\)\]/) pending = 1

  if (pending) {
    # Count braces on this line; the first '{' opens the test module.
    ob = gsub(/\{/, "{"); cb = gsub(/\}/, "}")
    if (ob > 0) {
      inside = 1
      test_balance = ob - cb
      pending = 0
    } else if (ob == 0 && cb == 0 && raw !~ /#\[/) {
      # cfg(test) applied to a non-block item (e.g. `use`); not a scope.
      pending = 0
    }
  } else if (inside) {
    ob = gsub(/\{/, "{"); cb = gsub(/\}/, "}")
    test_balance += (ob - cb)
    if (test_balance <= 0) { inside = 0; test_balance = 0 }
  }

  cur = inside

  if (target_all || (NR in target)) {
    status[NR] = cur
    line[NR] = raw
  }
}

END {
  if (target_all) {
    for (nr = 1; nr <= NR; nr++) {
      if (!(nr in status)) continue
      if (line[nr] ~ /\.unwrap\(/ || line[nr] ~ /\.expect\(/) {
        if (status[nr] == 0) print nr
      }
    }
  } else {
    for (i = 1; i <= max_target; i++) {
      if (!(tgt[i] in status)) continue
      nr = tgt[i]
      if (line[nr] ~ /\.unwrap\(/ || line[nr] ~ /\.expect\(/) {
        if (status[nr] == 0) print nr
      }
    }
  }
}
AWK

# ── awk: extract added line numbers from a unified (no-context) diff ───────────
read -r -d '' DIFF_AWK <<'AWK' || true
/^@@/ {
  s = $0
  sub(/.*\+/, "", s)   # keep from the last '+' (the new-file hunk start)
  sub(/,.*/, "", s)    # drop the ',count' and trailing '@@'
  nl = s + 0
  next
}
/^\+/ && !/^\+\+\+/ { print nl; nl++; next }
/^ / { nl++; next }
AWK

VIOLATIONS=0
CHECKED=0

shopt -s nullglob
for f in "$EXAMPLES_DIR"/*/src/lib.rs; do
  [ -f "$f" ] || continue
  rel="${f#"$REPO_ROOT"/}"

  # Gather the line numbers of newly added lines in this file.
  if git cat-file -e "${BASE_COMMIT}:${rel}" >/dev/null 2>&1; then
    ADDED=()
    while IFS= read -r ln; do
      [ -n "$ln" ] && ADDED+=("$ln")
    done < <(git diff -U0 "$BASE_COMMIT" -- "$rel" | awk "$DIFF_AWK")
  else
    # File is new on this branch: treat every line as a candidate.
    ADDED=("ALL")
  fi

  [ "${#ADDED[@]}" -gt 0 ] || continue

  if [ "${ADDED[0]}" = "ALL" ]; then
    RESULT="$(awk -v target_all=1 -v max_target=0 "$CLASSIFY_AWK" "$f")"
  else
    # Pass the added line numbers as a CSV string (awk -v can't set arrays).
    csv=""
    for ln in "${ADDED[@]}"; do
      csv="${csv:+$csv,}${ln}"
    done
    RESULT="$(awk -v targets_csv="$csv" -v max_target="${#ADDED[@]}" "$CLASSIFY_AWK" "$f")"
  fi

  if [ -n "$RESULT" ]; then
    while IFS= read -r bad; do
      [ -z "$bad" ] && continue
      VIOLATIONS=$((VIOLATIONS + 1))
      echo -e "${RED}[forbidden]${RESET} ${rel}:${bad}: new unwrap/expect outside #[cfg(test)]"
      sed -n "${bad}p" "$f" | sed 's/^/      /'
    done <<< "$RESULT"
  fi

  CHECKED=$((CHECKED + 1))
done

echo ""
if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}❌ Found ${VIOLATIONS} new unwrap/expect call(s) outside #[cfg(test)] modules.${RESET}"
  echo "   Replace with proper error handling (Result/Error enum) or move into a test module."
  exit 1
fi

echo -e "${GREEN}✅ No new unwrap/expect outside #[cfg(test)] modules (checked ${CHECKED} example crate(s)).${RESET}"
