# Fluxa – User Guide

Welcome to Fluxa — a zero-install LAN file explorer and transfer system.  
Open a browser on any device and you're browsing files at full LAN speed.

---

## Table of Contents

1. [What is Fluxa?](#what-is-fluxa)
2. [Two Modes: Server vs Client](#two-modes-server-vs-client)
3. [Platform Capability Matrix](#platform-capability-matrix)
4. [Running Fluxa — Platform Guide](#running-fluxa--platform-guide)
   - [Ubuntu / Debian / Linux](#ubuntu--debian--linux)
   - [Other Linux distros (Fedora, Arch, etc.)](#other-linux-distros)
   - [macOS](#macos)
   - [Windows (native)](#windows-native)
   - [Windows — WSL2](#windows--wsl2)
   - [Raspberry Pi / ARM Linux](#raspberry-pi--arm-linux)
   - [NAS / Server (headless)](#nas--server-headless)
   - [Android — Full Peer via Termux](#android--full-peer-via-termux)
   - [iOS — Full Peer via iSH (Advanced)](#ios--full-peer-via-ish-advanced)
   - [Chromebook — Full Peer via Linux container](#chromebook--full-peer-via-linux-container)
5. [Accessing Fluxa from any device (browser only)](#accessing-fluxa-from-any-device)
   - [iOS (iPhone / iPad) — browser client](#ios-iphone--ipad)
   - [Android — browser client](#android)
   - [Another PC or Mac](#another-pc-or-mac)
   - [Smart TV / Browser](#smart-tv--browser)
6. [Using the Interface](#using-the-interface)
7. [File Explorer Features](#file-explorer-features)
   - [Opening / Previewing Files](#opening--previewing-files)
   - [Show / Hide Hidden Files](#show--hide-hidden-files)
   - [Layouts (List, Grid, Table)](#layouts-list-grid-table)
   - [Sorting Files](#sorting-files)
   - [Searching Files](#searching-files)
   - [Upload, Download, Delete, Rename, Copy](#upload-download-delete-rename-copy)
8. [Connecting Devices](#connecting-devices)
9. [File Transfers Between Devices](#file-transfers-between-devices)
10. [QR Code Quick Connect](#qr-code-quick-connect)
11. [Configuration Options](#configuration-options)
12. [Troubleshooting](#troubleshooting)
13. [FAQ](#faq)

---

## What is Fluxa?

Fluxa turns any computer into a browser-accessible file server on your local network.

- **Browse** files from any device that has a browser — phone, tablet, TV, laptop
- **Preview** images, videos, audio, PDFs, and source code in the browser
- **Transfer** files at full LAN speed (gigabit, if your network supports it)
- **Discover** other Fluxa devices automatically — no manual IP entry needed
- **Zero install** on the receiving end — just open a URL

---

## Two Modes: Server vs Client

Understanding this distinction is the key to getting **full functionality** on every platform:

| Mode | What it means | Who needs it |
|------|--------------|--------------|
| **Server (full peer)** | You run the Fluxa binary. Your files appear in the file explorer. Other devices can discover you, connect to you, and transfer files to/from you. mDNS broadcasts your presence. | The device whose files you want to share |
| **Client (browser only)** | You open a browser and point it at a Fluxa server. You can browse, download, and upload to **that** server's files — but your own device's files are not exposed. | Anything that needs to access another device's files |

```
┌─────────────────────────────────────────────────────────────────┐
│  Device A (Server)          Device B (Server)                   │
│  Rust binary running        Rust binary running                  │
│  Files: /home/alice/        Files: /storage/Android/            │
│  mDNS: broadcasting ──────→ mDNS: broadcasting                  │
│         ↑ discovers ←──────                                     │
│                                                                 │
│         Both appear in each other's "Devices" panel             │
│         Either side can initiate transfers                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Device C (Client only)                                         │
│  Opens browser → http://192.168.1.42:7070                       │
│  Can browse Device A's files, upload to it, download from it    │
│  Cannot be discovered. Cannot share its own files via Fluxa.    │
└─────────────────────────────────────────────────────────────────┘
```

**To get full discovery + transfer capability on any device: run the binary on that device.**

---

## Platform Capability Matrix

| Platform | Run Server | Share Own Files | mDNS Auto-Discovery | Browser Client | Notes |
|----------|:----------:|:---------------:|:-------------------:|:--------------:|-------|
| Linux (any) | ✅ | ✅ | ✅ | ✅ | Native — recommended |
| macOS | ✅ | ✅ | ✅ | ✅ | Allow firewall prompt |
| Windows | ✅ | ✅ | ✅ | ✅ | Allow Defender Firewall |
| Raspberry Pi | ✅ | ✅ | ✅ | ✅ | Slow first build |
| Chromebook (Crostini) | ✅ | ✅ | ✅ | ✅ | Enable Linux container |
| **Android (Termux)** | ✅ | ✅ | ✅ | ✅ | Full peer — see guide below |
| **iOS (iSH)** | ⚠️ | ⚠️ | ⚠️ | ✅ | Very slow; see guide below |
| iOS (browser only) | ❌ | Upload only | ❌ | ✅ | No server possible |
| Smart TV / Fire TV | ❌ | ❌ | ❌ | ✅ | Browser access only |
| NAS / headless server | ✅ | ✅ | ✅ | ✅ | Run as service |

---

## Running Fluxa — Platform Guide

Fluxa is a single binary. You run it on the machine whose files you want to share.

### Ubuntu / Debian / Linux

**Prerequisites:** Rust toolchain + Node.js 18+

```bash
# 1. Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Install Node.js (if not already installed)
sudo apt update && sudo apt install nodejs npm -y

# 3. Install cargo-watch (for development hot-reload, optional)
cargo install cargo-watch

# 4. Build and run
cd /path/to/Fluxa
bash start.sh
```

Fluxa will listen on `http://0.0.0.0:7070`.  
Open **<http://localhost:7070>** in your browser.

To run in the background:

```bash
nohup bash start.sh &> fluxa.log &
```

To run as a systemd service so it starts on boot:

```ini
# /etc/systemd/system/fluxa.service
[Unit]
Description=Fluxa LAN File Server
After=network.target

[Service]
ExecStart=/path/to/Fluxa/backend/target/release/fluxa
WorkingDirectory=/path/to/Fluxa/backend
Restart=always
Environment=FLUXA_ROOT=/home/youruser

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now fluxa
```

---

### Other Linux Distros

The steps are identical — just use your distro's package manager:

| Distro | Install Node.js |
|--------|----------------|
| Fedora / RHEL | `sudo dnf install nodejs npm` |
| Arch / Manjaro | `sudo pacman -S nodejs npm` |
| openSUSE | `sudo zypper install nodejs npm` |
| Alpine | `apk add nodejs npm` |

After installing Node.js and Rust, run `bash start.sh` as on Ubuntu.

---

### macOS

**Prerequisites:** Homebrew, Rust, Node.js

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Rust
brew install rustup
rustup-init

# Install Node.js
brew install node

# Install cargo-watch (optional, for dev mode)
cargo install cargo-watch

# Build and run
cd /path/to/Fluxa
bash start.sh
```

Open **<http://localhost:7070>** in Safari, Chrome, or Firefox.

> **Firewall note:** macOS may ask "Do you want the application 'fluxa' to accept incoming network connections?" — click **Allow**. This is required for other devices to connect.

---

### Windows (native)

**Prerequisites:** Rust (via rustup), Node.js

1. Download and run **rustup-init.exe** from <https://rustup.rs>
2. Download and install **Node.js** from <https://nodejs.org> (LTS version)
3. Open **PowerShell** or **Command Prompt**:

```powershell
# Navigate to the Fluxa folder
cd C:\path\to\Fluxa

# Build the frontend
cd frontend
npm install
npm run build
cd ..

# Build and run the backend
cd backend
cargo build --release
.\target\release\fluxa.exe
```

Open **<http://localhost:7070>** in your browser.

> **Windows Defender Firewall:** The first time you run Fluxa, Windows may show a firewall prompt. Click **Allow access** (both Private and Public networks) to let other devices on your LAN connect.

**Optional: Run via `make`**  
If you have `make` installed (via Git for Windows or Chocolatey): `make start`

---

### Windows — WSL2

If you prefer a Linux environment on Windows:

```bash
# Inside WSL2 terminal
sudo apt update && sudo apt install nodejs npm -y
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
cd /path/to/Fluxa
bash start.sh
```

> **Important:** WSL2 has its own network interface. To access Fluxa from other devices on your LAN, find the WSL2 IP:
>
> ```bash
> ip addr show eth0 | grep "inet "
> ```
>
> Use that IP (e.g., `http://172.x.x.x:7070`) from other devices.  
> From the Windows host itself, use `http://localhost:7070`.

---

### Raspberry Pi / ARM Linux

Fluxa supports ARM. The build process is identical to Ubuntu/Linux.

```bash
# On Raspberry Pi (Raspberry Pi OS / Ubuntu)
sudo apt update && sudo apt install nodejs npm -y
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

cd /path/to/Fluxa
bash start.sh
```

> **Performance tip:** The first `cargo build --release` on a Raspberry Pi 4 takes ~10–15 minutes. Subsequent builds are much faster. Once built, the binary runs efficiently.

For headless operation (no screen), use the systemd service method described in the Ubuntu section. Then access Fluxa from any other device on your network.

---

### NAS / Server (headless)

Run Fluxa on a NAS or server and access it from all your devices:

```bash
# Set root to a specific share directory
FLUXA_ROOT=/data/shares FLUXA_PORT=7070 ./fluxa &
```

Point `FLUXA_ROOT` to whichever directory you want to expose. The server keeps running until killed.

---

### Android — Full Peer via Termux

**Termux** is a terminal emulator for Android that provides a real Linux environment with native ARM binaries. This makes Android a **full Fluxa peer** — its files appear in the explorer, it is discoverable via mDNS, and it can participate in all transfers.

#### Step 1 — Install Termux

> ⚠️ **Important:** Install from **[F-Droid](https://f-droid.org/packages/com.termux/)**, NOT the Google Play Store. The Play Store version is abandoned and outdated.

1. On your Android device, open a browser and go to **<https://f-droid.org>**
2. Download and install the F-Droid app (you'll need to allow "Install from unknown sources" in Settings)
3. Open F-Droid → search for **Termux** → install it

#### Step 2 — Grant storage access

Open Termux and run:

```bash
termux-setup-storage
```

Android will prompt you to grant Termux access to your files. Tap **Allow**.

After this, your phone's shared storage is accessible at `~/storage/shared/` (which maps to `/storage/emulated/0/`).

#### Step 3 — Install Rust, Node.js, and Git

```bash
pkg update && pkg upgrade -y
pkg install rust nodejs git -y
```

> **Note on build time:** The Rust compiler takes a few minutes to install on Android. The first `cargo build --release` takes 15–30 minutes on most phones. Subsequent builds are fast. You only need to build once.

#### Step 4 — Clone and build Fluxa

```bash
# Clone the repository
git clone https://github.com/your-org/Fluxa.git
cd Fluxa

# Build frontend (Node.js)
cd frontend
npm install
npm run build
cd ..

# Build backend (Rust)
cd backend
cargo build --release
```

#### Step 5 — Run Fluxa on Android

```bash
# Share your Downloads folder (adjust path as needed)
FLUXA_ROOT=$HOME/storage/shared \
FLUXA_DEVICE_NAME="$(hostname)" \
./target/release/fluxa
```

Fluxa is now running on your phone. Check what IP your phone has on the Wi-Fi:

```bash
ip addr show wlan0 | grep "inet "
# Example: inet 192.168.1.55/24
```

From any other device on the same network, open `http://192.168.1.55:7070` — you'll see your phone's files.

Your phone also appears in the **Devices** panel of any other Fluxa instance on the LAN (auto-discovered via mDNS).

#### Keeping Fluxa running in the background on Android

Android aggressively kills background processes. To keep Fluxa running:

```bash
# Option 1 — Termux wake-lock (prevents sleep, keeps the process alive)
termux-wake-lock
FLUXA_ROOT=$HOME/storage/shared ./target/release/fluxa &
```

For permanent operation, install **Termux:Boot** from F-Droid to auto-start at boot:

```bash
# Install Termux:Boot via F-Droid on your device, then:
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-fluxa.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/Fluxa/backend
FLUXA_ROOT=$HOME/storage/shared ./target/release/fluxa >> ~/fluxa.log 2>&1 &
EOF
chmod +x ~/.termux/boot/start-fluxa.sh
```

#### What Android storage paths to use

| Path alias | Actual location on phone | Contains |
|------------|--------------------------|----------|
| `~/storage/shared` | `/storage/emulated/0` | All user files |
| `~/storage/downloads` | Downloads folder | Downloads |
| `~/storage/dcim` | DCIM folder | Photos / Camera roll |
| `~/storage/pictures` | Pictures folder | Gallery images |
| `~/storage/music` | Music folder | Audio files |

#### Troubleshooting Termux

**`pkg: command not found`** — Termux may not be fully initialized. Run `apt update` first.

**Storage not accessible** — Re-run `termux-setup-storage` and tap Allow.

**`cannot find -lc` or linker errors** — Run `pkg install binutils` and retry the build.

**Out of space** — Fluxa builds take ~500 MB of disk. Free up space or move build to external storage.

**mDNS not working** — Some Android phones block multicast traffic. Use direct IP to connect: `http://PHONE_IP:7070`.

---

### iOS — Full Peer via iSH (Advanced)

iOS is the most restrictive mobile platform. Due to sandboxing and the App Store rules, you **cannot run native ARM binaries** directly. The options below all have trade-offs.

#### Option A — iSH (Alpine Linux emulator) — Recommended

**[iSH](https://apps.apple.com/app/ish-shell/id1436902243)** runs an Alpine Linux environment using x86 software emulation. It is the most practical way to run server-side code on iOS.

> ⚠️ **Important limitations of iSH:**
>
> - iSH emulates x86 in software — it is **much slower** than native execution
> - Building Rust from source on iSH is impractical (could take hours)
> - iSH can be backgrounded for ~30 seconds before iOS suspends it — use a charger and keep the app in the foreground
> - File access is limited to iSH's internal storage and Apple's Files app sandbox

**Install iSH:**

1. Open the App Store on your iPhone/iPad
2. Search for **iSH Shell** and install it (it's free)

**Install Node.js (runs at reasonable speed under iSH x86 emulation):**

```sh
apk update && apk add nodejs npm git
```

**Build and run only the frontend dev server (limited mode):**

Because Rust is impractical to build in iSH, you can run a **pre-built static copy** of the Fluxa frontend served by a lightweight Node.js static server — but this gives you no backend API. This is primarily useful for testing.

For a **fully functional server on iOS**, the realistic approach is:

#### Option B — Run Fluxa on another device, access from iOS browser

This is what most iOS users should do:

1. Run Fluxa on a Mac, PC, or Raspberry Pi
2. From your iPhone/iPad, open **Safari** → navigate to `http://HOST_IP:7070`
3. You can browse, upload files from iPhone's Photos/Files app, and download to iPhone

Uploading from iOS: tap ↑ in the Fluxa toolbar → iOS will show a file picker where you can select from Files, Photos, iCloud Drive, etc.

#### Option C — Use a-Shell (JavaScript via QuickJS)

**[a-Shell](https://apps.apple.com/app/a-shell/id1473805438)** provides a terminal with Python, Lua, and a C compiler (via clang to WebAssembly). It cannot run the full Fluxa stack but can be useful for scripting.

#### iOS capability summary

| Feature | iSH | Browser only |
|---------|-----|-------------|
| Share iOS files | ⚠️ Limited to iSH sandbox | Upload via browser ✅ |
| Browse another device's files | ✅ (via browser inside iSH) | ✅ |
| mDNS auto-discovery | ❌ (iSH cannot bind multicast) | ❌ |
| Download to iOS | ✅ | ✅ |
| Upload from iOS Photos | ❌ (iSH) | ✅ (browser) |

**Recommendation:** For casual iOS use, open Fluxa in Safari pointed at your desktop/Mac running Fluxa. For power users who want to expose iOS files: use iSH with `node` serving a simple directory listing, accepting uploads manually.

---

### Chromebook — Full Peer via Linux container

Chromebooks with the **Linux (Beta) / Crostini** feature can run the full Fluxa server:

1. Go to **Settings → Advanced → Developers → Linux development environment** → Turn On
2. Open the Linux terminal (search "Terminal" in the app launcher)
3. Follow the **Ubuntu / Debian / Linux** steps above (Chromebook's Linux is Debian-based)

```bash
# Inside ChromeOS Linux terminal
sudo apt update && sudo apt install nodejs npm -y
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
cd ~/Fluxa
bash start.sh
```

> **Network note:** The Linux container runs at `penguin.linux.test` inside ChromeOS, accessible at `http://localhost:7070` from the Chrome browser. To make it reachable from other LAN devices, find the Chromebook's real IP (`ip addr show eth0` inside Linux) and ensure port 7070 is not blocked by any ChromeOS firewall setting.

---

Once Fluxa is running on the host machine, **any device with a modern browser** can access it — no app download, no account.

### Find your host machine's IP address

| Platform | Command |
|----------|---------|
| Linux | `ip addr show \| grep "inet "` |
| macOS | `ipconfig getifaddr en0` (Wi-Fi) or `ipconfig getifaddr en1` |
| Windows | `ipconfig` → look for IPv4 under your Wi-Fi adapter |

Example: if the IP is `192.168.1.42`, open `http://192.168.1.42:7070` on any device.

> **Shortcut:** Click the **QR Code** button in the Fluxa toolbar. It shows a QR code encoding your exact URL — scan it with any phone camera to open instantly.

---

### iOS (iPhone / iPad)

1. Make sure your iPhone/iPad is on the **same Wi-Fi** as the host machine
2. Open the **Camera** app → point at the Fluxa QR code → tap the notification banner  
   **or** open **Safari** and type `http://192.168.1.42:7070` (use your actual IP)
3. The Fluxa UI loads in the browser
4. Browse, download, and upload files directly from iOS

> **Notes for iOS:**
>
> - Safari is recommended. Chrome on iOS also works.
> - For large file uploads, keep the browser tab active (do not background the app).
> - Videos, images, audio files, and PDFs can be previewed directly in the browser.

---

### Android

1. Connect to the same Wi-Fi network as the host
2. Open **Chrome** (or any browser) and navigate to `http://192.168.1.42:7070`
3. Browse and transfer files normally

> **Add to home screen:** In Chrome, tap the three-dot menu → **Add to Home screen** for an app-like experience.

> **Notes for Android:**
>
> - Chrome provides the best experience.
> - On Android, you can long-press a downloaded file in Chrome's download bar to share or open it with another app.

---

### Another PC or Mac

1. Both machines must be on the same network
2. Open any browser on the second machine
3. Go to `http://HOST_IP:7070`

Works in Chrome, Firefox, Safari, Opera, and Edge.

---

### Chromebook

1. Connect to the same Wi-Fi
2. Open Chrome and go to `http://HOST_IP:7070`
3. Everything works natively — no Linux environment needed on the Chromebook

---

### Smart TV / Browser

Any Smart TV with a browser app (Samsung, LG, Sony with built-in browsers, or Fire TV Silk browser) can access Fluxa:

1. Open the TV's browser
2. Navigate to `http://HOST_IP:7070`

> Interaction is limited by the TV remote, but downloading and streaming media files works well.

---

## Using the Interface

```
┌──────────────────────────────────────────────────────────┐
│  🌊 Fluxa                         Flash ● 2 📡 QR  ⊞   │
├──────────┬───────────────────────────────────────────────┤
│          │ ← /home/user/     [🔍] 👁 ☰ ⋮ ↕  ＋ ↑ ↺    │
│  Files   │───────────────────────────────────────────────│
│  ────  ← │ 📁 Documents             Apr 10    —          │
│  Devices │ 📁 Downloads             Apr 11    —          │
│          │ 🖼 photo.jpg             Apr 11    3.5 MB     │
│  Trans-  │ 📄 report.pdf            Apr 10    1.2 MB     │
│  fers    │ </> main.rs              Apr 09    4.8 KB     │
└──────────┴───────────────────────────────────────────────┘
```

### Left Sidebar

| Section | Purpose |
|---------|---------|
| **Files** | File explorer — browse, open, upload, download |
| **Devices** | LAN devices that have Fluxa running |
| **Transfers** | Active and completed file transfer progress |

### Top Toolbar (File Explorer)

| Control | Description |
|---------|-------------|
| ← (back arrow) | Go up one folder level |
| Breadcrumb path | Click any segment to jump to that folder |
| 🔍 Search box | Filter files in the current folder by name (real-time) |
| 👁 / 👁‍🗨 Eye icon | Toggle visibility of hidden files (dot-files) |
| ☰ / ⊞ / ≡ Layout | Switch between List, Grid, and Table views |
| Sort dropdown | Sort by Name, Size, or Date (List and Grid modes) |
| ＋ Folder | Create a new subfolder |
| ↑ Upload | Upload files from your device |
| ↺ Refresh | Reload the current directory listing |

---

## File Explorer Features

### Opening / Previewing Files

**Double-click** any file to open it in the built-in viewer. The viewer supports:

| File type | How it's shown |
|-----------|---------------|
| Images (jpg, png, gif, webp, svg, …) | Full-resolution image viewer |
| Videos (mp4, webm, mkv, …) | HTML5 video player with controls |
| Audio (mp3, ogg, flac, wav, …) | Audio player |
| PDFs | Embedded PDF viewer |
| Source code / text (rs, py, js, ts, md, json, yaml, …) | Syntax-highlighted text with monospace font |
| Binary / unknown | File info + Download button |

> Files larger than 2 MiB in text view are truncated — a warning banner appears. Download the full file for complete contents.

You can also right-click any file → **Open / Preview** to open the viewer.

---

### Show / Hide Hidden Files

Click the **Eye** (👁) icon in the toolbar.

- **Eye icon (active/cyan):** Hidden files and folders are visible. Dot-files like `.bashrc`, `.git/`, `.env` appear in the listing.
- **Eye-slash icon (inactive):** Hidden files are filtered out. This is the default.

The change takes effect immediately — no page reload required.

---

### Layouts (List, Grid, Table)

Click the layout switcher buttons in the toolbar:

| Icon | Layout | Best for |
|------|--------|----------|
| ☰ List | One item per row with name, date, size | General navigation |
| ⊞ Grid | Icon grid (thumbnail-style) | Photo and media folders |
| ≡ Table | Multi-column table with sortable headers | Comparing file metadata |

The layout preference is remembered for the session.

**Grid view** — columns auto-adjust with screen width (4 on phone → 12 on large monitor).

**Table view** — click any column header (Name, Type, Modified, Size) to sort. Click again to reverse direction.

---

### Sorting Files

Directories always appear before files regardless of sort order.

**List / Grid views:** Use the **sort dropdown** in the toolbar:

- Name A→Z / Z→A
- Size ascending / descending
- Newest first / Oldest first

**Table view:** Click column headers directly. The active sort column shows an arrow (↑ or ↓).

---

### Searching Files

Type in the **Search box** (🔍) in the toolbar to filter items in the current folder by name.

- Filtering is **instant** — results update as you type
- Search is **case-insensitive**
- Works in all three layout modes
- Click **×** or clear the box to show all files again
- Search does **not** recurse into subfolders — navigate into a folder first

---

### Upload, Download, Delete, Rename, Copy

| Action | How |
|--------|-----|
| **Upload** | Click ↑ in toolbar, or drag-and-drop files onto the file list |
| **Download** | Right-click file → Download, or open it and click Download in the viewer |
| **Delete** | Right-click → Delete (confirm prompt). Select multiple files → Delete N button |
| **Rename** | Right-click → Rename → type new name → Enter |
| **Copy** | Right-click → Copy here → creates `filename_copy.ext` in same folder |
| **New folder** | Click ＋ in toolbar → type name → Enter |

> ⚠️ Deletion is **permanent**. There is no recycle bin or undo.

---

## Connecting Devices

### On the Requesting Device

1. Click **Devices** in the sidebar
2. Fluxa devices on your network appear automatically via mDNS
3. Click **Connect** next to a device
4. A pending notification is sent to that device

### On the Accepting Device

1. A popup appears: **"[Device name] wants to connect"**
2. Click **Accept** to allow, or **Reject** to decline
3. Once accepted, the session becomes Active

---

## File Transfers Between Devices

After a connection is established:

1. The **Transfers** panel shows real-time progress
2. Active transfers display a percentage and bytes transferred
3. Completed transfers show a green checkmark
4. Failed transfers show red with a reason

**Clear history:** Click the trash icon in the Transfers panel header to remove completed/failed entries.

---

## QR Code Quick Connect

1. Click the **QR** button in the top-right of the app
2. A QR code appears showing your Fluxa URL
3. Scan it with any phone camera (iOS Camera app or Android scanner)
4. The browser opens Fluxa automatically — no typing required

---

## Configuration Options

All options are set via environment variables before running:

```bash
# Change root directory (default: home directory)
FLUXA_ROOT=/path/to/share bash start.sh

# Change port (default: 7070)
FLUXA_PORT=8080 bash start.sh

# Change device name shown to other peers
FLUXA_DEVICE_NAME="Living Room PC" bash start.sh

# Change bind address (default: 0.0.0.0 = all interfaces)
FLUXA_HOST=192.168.1.42 bash start.sh

# Enable verbose debug logging
RUST_LOG="fluxa_backend=debug" bash start.sh

# Combine multiple options
FLUXA_ROOT=~/Documents FLUXA_PORT=9000 FLUXA_DEVICE_NAME="Laptop" bash start.sh
```

Defaults when no variables are set:

| Variable | Default |
|----------|---------|
| `FLUXA_ROOT` | `$HOME` |
| `FLUXA_PORT` | `7070` |
| `FLUXA_HOST` | `0.0.0.0` |
| `FLUXA_DEVICE_NAME` | Hostname |

---

## Troubleshooting

### "No devices found" in the Devices panel

- Ensure both devices are on the **same Wi-Fi / LAN segment**
- Check that no firewall is blocking **UDP port 5353** (mDNS) or **TCP port 7070**
- Try refreshing — click the Refresh button in the Devices panel
- As a fallback, manually type the host's IP into the browser

### Can't connect from another device

- Confirm the host is listening: the terminal should show `Fluxa listening on http://0.0.0.0:7070`
- Use the host's **LAN IP address**, not `localhost` (which only works on the same machine)
- On Windows, allow Fluxa through the **Windows Defender Firewall**
- On macOS, allow incoming connections when prompted
- Disable VPN software — VPNs often prevent LAN device discovery

### Preview / viewer doesn't load

- Ensure the backend is running
- For large video files, the browser may need time to buffer — this is normal
- PDFs render using the browser's built-in PDF viewer. If blank, try a different browser

### Upload fails — "File exceeds maximum size"

- Default limit is **4 GiB** per file
- For larger files, use chunked transfer via the API (see [docs/api.md](api.md))

### Files don't appear in the listing

- Check that `FLUXA_ROOT` points to an accessible directory
- Verify the directory has read permissions for the running user
- Hidden files are filtered by default — click the Eye icon to show them

### WSL2 — other devices can't connect

Find the WSL2 IP: `ip addr show eth0 | grep "inet "` and use that IP, e.g. `http://172.x.x.x:7070`.  
Optionally set up a Windows port proxy: `netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=7070 connectaddress=WSL_IP connectport=7070`

---

## FAQ

**Q: Does Fluxa work over the internet?**  
A: No — Fluxa is designed for local networks (LAN / Wi-Fi). All data stays on your local network.

**Q: Is it secure?**  
A: Fluxa includes path-traversal protection and consent-based peer connections. However, it does not encrypt traffic between devices on the LAN. For sensitive data over untrusted networks, use a VPN.

**Q: Can multiple people access it at the same time?**  
A: Yes. Fluxa supports multiple concurrent WebSocket clients and browser sessions.

**Q: How do I stop Fluxa?**  
A: Press `Ctrl+C` in the terminal. Or, if running as a service: `sudo systemctl stop fluxa`.

**Q: Can I limit access to specific folders only?**  
A: Set `FLUXA_ROOT` to the folder you want to share. Users can only browse within that directory.

**Q: Where are uploaded files saved?**  
A: Files upload to whichever folder you have open in the browser at the time of upload.

**Q: Does it work on a mobile hotspot?**  
A: Yes, as long as both the host and accessing device are connected to the same hotspot.

**Q: Can I run multiple instances on different ports?**  
A: Yes. Set `FLUXA_PORT` to different values for each instance and point `FLUXA_ROOT` to different directories.

---

*Fluxa — Built with Rust + React*

- **Browse** files on your computer from any browser on the network
- **Transfer** files between devices at full LAN speed (no internet needed)
- **Discover** other Fluxa devices automatically (no manual IP entry)
- **Share** files with friends on the same network with one click

Think of it like AirDrop, but it works on any device with a browser.

---

---

*Fluxa — Built with Rust + React*
