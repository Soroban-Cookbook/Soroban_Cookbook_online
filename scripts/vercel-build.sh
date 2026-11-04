#!/usr/bin/env bash
# Vercel build when project root is the repository root (not documentation/).
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${root}/documentation"
exec bun run build
