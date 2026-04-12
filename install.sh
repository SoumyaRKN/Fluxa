#!/usr/bin/env bash
# Fluxa — one-line installer for Linux and macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
#
# What this script does:
#   1. Detects your OS and architecture
#   2. Downloads the latest pre-built Fluxa binary from GitHub Releases
#   3. Places it in ~/.local/bin (no sudo needed)
#   4. Adds ~/.local/bin to your PATH if it isn't already there
#   5. Prints how to run Fluxa

set -euo pipefail

REPO="SoumyaRKN/Fluxa"
INSTALL_DIR="$HOME/.local/bin"
BINARY="fluxa"
GITHUB_API="https://api.github.com/repos/$REPO/releases/latest"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▶  $*${RESET}"; }
success() { echo -e "${GREEN}✔  $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
error()   { echo -e "${RED}✘  $*${RESET}" >&2; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔═══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║        Fluxa Installer                ║${RESET}"
echo -e "${BOLD}╚═══════════════════════════════════════╝${RESET}"
echo ""

# ── Detect OS ─────────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)   PLATFORM="linux" ;;
  Darwin)  PLATFORM="macos" ;;
  *)       error "Unsupported OS: $OS. Use the Windows installer (install.ps1) on Windows." ;;
esac

case "$ARCH" in
  x86_64)          ARCH_TAG="x86_64" ;;
  aarch64|arm64)   ARCH_TAG="aarch64" ;;
  armv7l)          ARCH_TAG="armv7" ;;
  *)               error "Unsupported CPU architecture: $ARCH" ;;
esac

ASSET_NAME="fluxa-${PLATFORM}-${ARCH_TAG}"
info "Detected: $OS ($ARCH) → looking for $ASSET_NAME"

# ── Check dependencies ────────────────────────────────────────────────────────
for cmd in curl tar; do
  command -v "$cmd" &>/dev/null || error "'$cmd' is required but not found. Install it first."
done

# ── Fetch latest release info ─────────────────────────────────────────────────
info "Fetching latest Fluxa release..."
API_RESPONSE="$(curl -fsSL "$GITHUB_API" 2>/dev/null)" || error "Could not reach GitHub API. Check your internet connection."
LATEST_TAG="$(echo "$API_RESPONSE" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"

if [[ -z "$LATEST_TAG" ]]; then
  error "Could not determine latest release tag. The repository may not have published releases yet.
  Try building from source: https://github.com/$REPO#build-from-source"
fi

info "Latest version: $LATEST_TAG"

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/${ASSET_NAME}.tar.gz"

# ── Download ──────────────────────────────────────────────────────────────────
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

info "Downloading $DOWNLOAD_URL ..."
curl -fsSL --progress-bar "$DOWNLOAD_URL" -o "$TMP_DIR/fluxa.tar.gz" \
  || error "Download failed. The binary for your platform ($ASSET_NAME) may not be available for this release.
  See: https://github.com/$REPO/releases/$LATEST_TAG"

# ── Install ───────────────────────────────────────────────────────────────────
tar -xzf "$TMP_DIR/fluxa.tar.gz" -C "$TMP_DIR"

EXTRACTED_BINARY="$(find "$TMP_DIR" -name "fluxa" -type f | head -1)"
[[ -z "$EXTRACTED_BINARY" ]] && error "Could not find 'fluxa' binary in the downloaded archive."

mkdir -p "$INSTALL_DIR"
cp "$EXTRACTED_BINARY" "$INSTALL_DIR/$BINARY"
chmod +x "$INSTALL_DIR/$BINARY"

success "Installed fluxa $LATEST_TAG → $INSTALL_DIR/$BINARY"

# ── PATH setup ───────────────────────────────────────────────────────────────
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  warn "$INSTALL_DIR is not in your PATH. Adding it now..."
  for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    if [[ -f "$rc" ]]; then
      echo '' >> "$rc"
      echo '# Fluxa' >> "$rc"
      echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$rc"
      success "Added to $rc"
      break
    fi
  done
  warn "Restart your terminal or run:  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Fluxa is installed!${RESET}"
echo ""
echo -e "  Start Fluxa:    ${CYAN}fluxa${RESET}"
echo -e "  Share a folder: ${CYAN}FLUXA_ROOT=/path/to/folder fluxa${RESET}"
echo -e "  Then open:      ${CYAN}http://localhost:7070${RESET}"
echo ""
echo -e "  Uninstall:      ${CYAN}rm $INSTALL_DIR/fluxa${RESET}"
echo ""
