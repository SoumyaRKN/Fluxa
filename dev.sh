#!/usr/bin/env bash
# Fluxa – dev.sh  (hot-reload for development)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Run backend and frontend concurrently
echo "Starting Fluxa in development mode..."
echo "  Backend  → http://localhost:7070"
echo "  Frontend → http://localhost:5173  (Vite dev server with HMR)"
echo ""

# Background: run Rust backend with cargo watch if available
if command -v cargo-watch &>/dev/null; then
  (cd "$BACKEND_DIR" && RUST_LOG="fluxa_backend=debug,tower_http=info" cargo watch -x run) &
else
  (cd "$BACKEND_DIR" && RUST_LOG="fluxa_backend=debug,tower_http=info" cargo run) &
fi

BACKEND_PID=$!

# Foreground: run Vite dev server
cd "$FRONTEND_DIR"
npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null || true
