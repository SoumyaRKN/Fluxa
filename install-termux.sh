#!/data/data/com.termux/files/usr/bin/bash
# Fluxa installer for Android (Termux)
# Usage (in Termux): curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install-termux.sh | bash
#
# This script:
#   1. Checks if a prebuilt Android binary exists for this release
#   2. If yes  → downloads and installs it directly (fast, ~10 MB, no build needed)
#   3. If no   → falls back to building from source (slow, one-time ~30 min)

set -euo pipefail

REPO="SoumyaRKN/Fluxa"
INSTALL_DIR="$HOME/.local/bin"
GITHUB_API="https://api.github.com/repos/$REPO/releases/latest"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▶  $*${RESET}"; }
success() { echo -e "${GREEN}✔  $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
error()   { echo -e "${RED}✘  $*${RESET}" >&2; exit 1; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║    Fluxa Installer — Android / Termux    ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── Detect CPU arch ───────────────────────────────────────────────────────────
ARCH="$(uname -m)"
case "$ARCH" in
  aarch64) ARCH_TAG="aarch64" ;;
  armv7l)  ARCH_TAG="armv7" ;;
  x86_64)  ARCH_TAG="x86_64" ;;     # x86 Android (emulator/some tablets)
  *)       error "Unsupported CPU: $ARCH" ;;
esac
ASSET_NAME="fluxa-android-${ARCH_TAG}"
info "CPU: $ARCH → looking for pre-built binary $ASSET_NAME"

# ── Ensure Termux packages are fully up to date ───────────────────────────────
# A full upgrade (not just `pkg update + pkg install`) is required to keep all
# shared libraries consistent.  Partial upgrades are the #1 cause of the
# "CANNOT LINK EXECUTABLE curl" / libngtcp2_crypto_ossl symbol error.
info "Upgrading Termux packages (ensures curl/openssl stay in sync)..."
pkg upgrade -y
pkg install -y tar

# ── Grant storage access (non-interactive: only prompts if not already done) ──
if [[ ! -d "$HOME/storage" ]]; then
  info "Requesting storage access (Android will show a permission dialog)..."
  termux-setup-storage
  echo ""
  warn "If a permission dialog appeared, tap Allow, then re-run this installer."
  warn "Command: curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install-termux.sh | bash"
  exit 0
fi

# ── Try downloading a prebuilt binary first ───────────────────────────────────
info "Checking GitHub for a prebuilt binary..."
API_RESPONSE="$(curl -fsSL "$GITHUB_API" 2>/dev/null)" || {
  warn "Could not reach GitHub API — check Wi-Fi and retry."
  exit 1
}
LATEST_TAG="$(echo "$API_RESPONSE" | grep '"tag_name"' | head -1 \
  | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/${ASSET_NAME}.tar.gz"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PREBUILT_OK=0
if curl -fsSL --head "$DOWNLOAD_URL" 2>/dev/null | grep -q "200\|302"; then
  info "Prebuilt binary found ($LATEST_TAG). Downloading..."
  if curl -fsSL --progress-bar "$DOWNLOAD_URL" -o "$TMP_DIR/fluxa.tar.gz"; then
    tar -xzf "$TMP_DIR/fluxa.tar.gz" -C "$TMP_DIR"
    EXTRACTED="$(find "$TMP_DIR" -name "fluxa" -type f | head -1)"
    if [[ -n "$EXTRACTED" ]]; then
      mkdir -p "$INSTALL_DIR"
      cp "$EXTRACTED" "$INSTALL_DIR/fluxa"
      chmod +x "$INSTALL_DIR/fluxa"
      PREBUILT_OK=1
      success "Installed prebuilt fluxa $LATEST_TAG → $INSTALL_DIR/fluxa"
    fi
  fi
fi

# ── Fallback: build from source ───────────────────────────────────────────────
if [[ $PREBUILT_OK -eq 0 ]]; then
  warn "No prebuilt binary found for $ARCH_TAG. Falling back to building from source."
  warn "This will take 20–45 minutes on the first run. The app will run at full speed afterwards."
  echo ""
  read -r -p "Continue with source build? [Y/n] " ANSWER
  case "${ANSWER:-Y}" in
    [Yy]*) ;;
    *)     info "Aborted. Check https://github.com/$REPO/releases for manual downloads."; exit 0 ;;
  esac

  info "Installing build tools (Rust, Node.js, Git)..."
  pkg install -y rust nodejs git binutils

  BUILD_DIR="$HOME/fluxa-build"
  if [[ ! -d "$BUILD_DIR/.git" ]]; then
    info "Cloning Fluxa repository..."
    git clone "https://github.com/$REPO.git" "$BUILD_DIR"
  else
    info "Updating existing clone..."
    git -C "$BUILD_DIR" pull --ff-only
  fi

  info "Building frontend (~3 minutes)..."
  cd "$BUILD_DIR/frontend"
  npm install --silent
  npm run build

  info "Building backend (~30 minutes on first run)..."
  cd "$BUILD_DIR/backend"
  cargo build --release

  mkdir -p "$INSTALL_DIR"
  cp "$BUILD_DIR/backend/target/release/fluxa" "$INSTALL_DIR/fluxa"
  chmod +x "$INSTALL_DIR/fluxa"
  success "Built and installed fluxa → $INSTALL_DIR/fluxa"
fi

# ── PATH setup ────────────────────────────────────────────────────────────────
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    if [[ -f "$rc" ]]; then
      echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$rc"
      break
    fi
  done
fi
export PATH="$INSTALL_DIR:$PATH"

# ── Create a startup script ───────────────────────────────────────────────────
cat > "$HOME/start-fluxa.sh" << 'LAUNCHER'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
FLUXA_ROOT="$HOME/storage/shared"
FLUXA_DEVICE_NAME="${FLUXA_DEVICE_NAME:-My Android}"
exec "$HOME/.local/bin/fluxa"
LAUNCHER
chmod +x "$HOME/start-fluxa.sh"

# ── Termux:Boot integration ───────────────────────────────────────────────────
BOOT_DIR="$HOME/.termux/boot"
if [[ ! -d "$BOOT_DIR" ]]; then
  mkdir -p "$BOOT_DIR"
  cat > "$BOOT_DIR/fluxa.sh" << 'BOOT'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
sleep 5   # let networking settle after boot
FLUXA_ROOT="$HOME/storage/shared" "$HOME/.local/bin/fluxa" >> "$HOME/fluxa.log" 2>&1
BOOT
  chmod +x "$BOOT_DIR/fluxa.sh"
  success "Auto-start configured (requires Termux:Boot from F-Droid)"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Fluxa is installed!${RESET}"
echo ""
echo -e "  Start now:  ${CYAN}bash ~/start-fluxa.sh${RESET}"
echo -e "  — or —      ${CYAN}fluxa${RESET}"
echo ""
echo -e "  Find your Wi-Fi IP:"
echo -e "    ${CYAN}ip addr show wlan0 | grep 'inet '${RESET}"
echo ""
echo -e "  Then open ${CYAN}http://YOUR_PHONE_IP:7070${RESET} on any device."
echo ""
echo -e "  To share a specific folder set FLUXA_ROOT before running:"
echo -e "    ${CYAN}FLUXA_ROOT=\$HOME/storage/downloads fluxa${RESET}"
echo ""
