#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Fluxa – start.sh
# One-click launcher: builds frontend → copies assets → runs backend
# ─────────────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "═══════════════════════════════════════"
echo "  Fluxa Launcher"
echo "═══════════════════════════════════════"

# 1. Build frontend
echo ""
echo "▶  Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

# 2. Build backend (release)
echo ""
echo "▶  Building backend..."
cd "$BACKEND_DIR"
cargo build --release 2>&1 | grep -E "Compiling|Finished|error"

# 3. Run
echo ""
echo "▶  Starting Fluxa..."
echo "   Open http://localhost:7070 in your browser"
echo "   Press Ctrl+C to stop"
echo ""
cd "$BACKEND_DIR"
RUST_LOG="fluxa_backend=info,tower_http=warn" ./target/release/fluxa
