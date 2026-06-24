#!/usr/bin/env bash
#
# test.sh — install, build, and preview lit-clock locally.
# Usage:  bash test.sh        (from anywhere)
#
set -euo pipefail

# Repo location (absolute, so you can run this from anywhere)
REPO="/Users/jorge.olivares/Library/CloudStorage/OneDrive-CoxAutomotive/Documents/AI/GitHub/lit-clock"
cd "$REPO"

echo "==> Node version: $(node -v 2>/dev/null || echo 'NOT FOUND — install Node 20+ first')"
echo "==> Installing dependencies..."
npm install

echo "==> Building (production static output)..."
npm run build

echo ""
echo "==> Starting preview server."
echo "    Open this URL in your browser:  http://localhost:4173/lit-clock/"
echo "    (Press Ctrl+C to stop.)"
echo ""
npm run preview
