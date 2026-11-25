#!/usr/bin/env bash
# Vercel development script for Soroban Cookbook documentation (executed from repo root).
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${root}/documentation"
exec bun start
