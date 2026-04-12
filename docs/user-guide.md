# Fluxa – User Guide

Welcome to Fluxa — a zero-install LAN file explorer and transfer system.  
Open a browser on any device and you're browsing files at full LAN speed.

---

## Table of Contents

1. [What is Fluxa?](#what-is-fluxa)
2. [Running Fluxa — Platform Guide](#running-fluxa--platform-guide)
   - [Ubuntu / Debian / Linux](#ubuntu--debian--linux)
   - [Other Linux distros (Fedora, Arch, etc.)](#other-linux-distros)
   - [macOS](#macos)
   - [Windows (native)](#windows-native)
   - [Windows — WSL2](#windows--wsl2)
   - [Raspberry Pi / ARM Linux](#raspberry-pi--arm-linux)
   - [NAS / Server (headless)](#nas--server-headless)
3. [Accessing Fluxa from any device (no install)](#accessing-fluxa-from-any-device)
   - [iOS (iPhone / iPad)](#ios-iphone--ipad)
   - [Android](#android)
   - [Another PC or Mac](#another-pc-or-mac)
   - [Chromebook](#chromebook)
   - [Smart TV / Browser](#smart-tv--browser)
4. [Using the Interface](#using-the-interface)
5. [File Explorer Features](#file-explorer-features)
   - [Opening / Previewing Files](#opening--previewing-files)
   - [Show / Hide Hidden Files](#show--hide-hidden-files)
   - [Layouts (List, Grid, Table)](#layouts-list-grid-table)
   - [Sorting Files](#sorting-files)
   - [Searching Files](#searching-files)
   - [Upload, Download, Delete, Rename, Copy](#upload-download-delete-rename-copy)
6. [Connecting Devices](#connecting-devices)
7. [File Transfers Between Devices](#file-transfers-between-devices)
8. [QR Code Quick Connect](#qr-code-quick-connect)
9. [Configuration Options](#configuration-options)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## What is Fluxa?

Fluxa turns any computer into a browser-accessible file server on your local network.

- **Browse** files from any device that has a browser — phone, tablet, TV, laptop
- **Preview** images, videos, audio, PDFs, and source code in the browser
- **Transfer** files at full LAN speed (gigabit, if your network supports it)
- **Discover** other Fluxa devices automatically — no manual IP entry needed
- **Zero install** on the receiving end — just open a URL

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

## Accessing Fluxa from any device

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

## What is Fluxa?

Fluxa is a file-sharing tool for your **local network** (home WiFi, office LAN). It lets you:

- **Browse** files on your computer from any browser on the network
- **Transfer** files between devices at full LAN speed (no internet needed)
- **Discover** other Fluxa devices automatically (no manual IP entry)
- **Share** files with friends on the same network with one click

Think of it like AirDrop, but it works on any device with a browser.

---

## Step 1 – Starting Fluxa

### On Linux / macOS

1. Open a terminal in the Fluxa folder
2. Run:

   ```bash
   bash start.sh
   ```

3. You'll see:

   ```
   Fluxa listening on http://0.0.0.0:7070
   ```

4. Open your browser and go to:

   ```
   http://localhost:7070
   ```

### On Another Device (Phone, Tablet, etc.)

1. Find your computer's IP address:
   - Linux: `ip addr show | grep "inet "`
   - macOS: `ifconfig | grep "inet "`
   - Windows: `ipconfig`
2. On the other device's browser, type: `http://YOUR_IP:7070`
   - Example: `http://192.168.1.10:7070`

> **Tip:** Click the **QR Code** button (top-right) to instantly open Fluxa on your phone — just scan the code with your camera.

---

## Step 2 – The Interface

```
┌──────────────────────────────────────────────────────┐
│ 🌊 Fluxa                           Flash  📡 QR  ⊞ │
├─────────┬────────────────────────────────────────────┤
│         │ ← /home/user/                        ⊞ ↑  │
│  Files  │──────────────────────────────────────────  │
│  ──── ← │ 📁 Documents         Mar 15   —            │
│  Devices│ 📁 Downloads         Apr 02   —            │
│         │ 📄 report.pdf        Apr 10   1.2 MB       │
│  Trans- │ 📄 photo.jpg         Apr 11   3.5 MB       │
│  fers   │                                            │
└─────────┴────────────────────────────────────────────┘
```

### Left Sidebar

Three sections:

- **Files** – the file explorer (default view)
- **Devices** – nearby Fluxa devices on your network
- **Transfers** – file transfer history and active progress

### Top Bar

- **Fluxa logo** – always visible
- **Device name** (green dot = server is running)
- **Nearby count** – number of discovered devices
- **QR Code button** – show QR to connect from phone

---

## Step 3 – Browsing Files

1. Click **Files** in the sidebar
2. You'll see the contents of your home directory
3. **Double-click** a folder to open it
4. Use the **← back arrow** to go up one level
5. Click the **breadcrumb** links at the top to jump to any parent folder

---

## Step 4 – Uploading Files

### Method 1: Drag and Drop

1. Open the folder where you want to upload
2. Drag files from your computer's file manager and **drop them** in the Fluxa file list area
3. A "Drop to upload" overlay appears — release to upload
4. Watch the progress bar at the top

### Method 2: File Picker Button

1. Click the **upload icon** (↑) in the toolbar
2. Select one or more files
3. They'll upload to the current folder

---

## Step 5 – Downloading Files

1. **Right-click** on any file in the file list
2. Choose **Download** from the context menu
3. The file will download to your browser's download folder

---

## Step 6 – Managing Files

### Create a Folder

1. Click the **folder+ icon** in the toolbar
2. Type the folder name
3. Press **Enter** to create

### Rename a File/Folder

1. Right-click the file or folder
2. Choose **Rename**
3. Type the new name, press **Enter**

### Copy a File/Folder

1. Right-click the file or folder you want to copy
2. Choose **Copy here** from the context menu
3. A copy is created in the **current directory** with `_copy` appended to the name (e.g. `report_copy.pdf`)
4. If a file with that name already exists, the timestamp is appended to make it unique

> You can rename the copy immediately after by right-clicking the new entry and choosing **Rename**.

### Delete a File/Folder

1. Right-click the file or folder
2. Choose **Delete**
3. Confirm the deletion prompt

> ⚠️ Deletion is permanent. There is no recycle bin.

### Delete Multiple Files at Once

1. Click one or more files to select them (they'll highlight)
2. A **Delete N** button appears in the toolbar (where N is the number selected)
3. Click it to delete all selected items at once
4. To clear your selection, click any empty area in the file list

> ⚠️ Batch deletion is also permanent and cannot be undone.

---

## Step 7 – Connecting to Another Device

### On Device A (the one sending a connection request)

1. Click **Devices** in the sidebar
2. You'll see all Fluxa devices on your network listed automatically
3. Find the device you want to connect to and click **Connect**
4. A notification will show "Connection request sent to [device name]"

### On Device B (the one receiving)

1. A popup appears: **"[Device A] wants to connect"**
2. Click **Accept** to allow, or **Reject** to decline
3. Once accepted, the session becomes Active

---

## Step 8 – Transferring Files Between Devices

After establishing a connection (Step 7):

> *Note: In the current version, transfers are initiated via the API. The UI transfer panel shows incoming transfers in real-time.*

File transfer progress is visible in the **Transfers** panel:

- Active transfers show a progress bar with percentage
- Completed transfers show "Done" with a green checkmark
- Failed transfers show "Failed" in red

### Clearing Transfer History

Once a transfer is complete or failed, its entry stays in the panel until you clear it.

1. Click the **trash icon** (🗑) button in the top-right of the Transfers panel
2. All completed and failed entries are removed
3. Any currently active or pending transfers remain

> The button only appears when there is at least one completed or failed transfer to clear.

---

## Step 9 – Using the QR Code (Quick Connect)

1. Click the **QR Code** icon in the top-right
2. A QR code popup appears showing your device's URL
3. Scan it with **any smartphone** camera
4. The phone browser opens Fluxa automatically
5. Now you can browse and download files from your phone!

---

## Tips & Tricks

### Change the Root Directory

By default, Fluxa shows your home directory. To change it:

```bash
FLUXA_ROOT=/path/to/share bash start.sh
```

Example – share only your Downloads folder:

```bash
FLUXA_ROOT=~/Downloads bash start.sh
```

### Change the Port

```bash
FLUXA_PORT=8080 bash start.sh
```

### Change Your Device Name

```bash
FLUXA_DEVICE_NAME="Office PC" bash start.sh
```

### Enable Verbose Logging

```bash
RUST_LOG="fluxa_backend=debug" bash start.sh
```

---

## Troubleshooting

### "No devices found" in the Devices panel

- Make sure both devices are on the **same WiFi network or LAN**
- Check that no firewall is blocking **UDP port 5353** (mDNS) or **TCP port 7070**
- Try the **Refresh** button in the Devices panel
- If mDNS doesn't work, you can still connect manually using the direct URL

### Files don't appear in the list

- Check that `FLUXA_ROOT` points to an accessible directory
- Make sure the folder has read permissions for your user

### Upload fails with "File exceeds maximum size"

- Default limit is 4 GB per file
- Increase it with environment variable (advanced users – edit `config.rs`)

### The browser can't connect to Fluxa

1. Make sure Fluxa is running (check the terminal for the listening message)
2. Check the port: default is 7070
3. If connecting from another device, use the machine's LAN IP, not `localhost`
4. Check any VPN software – VPNs often prevent LAN discovery

---

## Frequently Asked Questions

**Q: Does Fluxa work over the internet?**  
A: No, Fluxa is designed for local networks only. All data stays on your LAN.

**Q: Is my data secure?**  
A: Fluxa uses path traversal protection and consent-based connections. However, it does not use encryption between devices on the same LAN. For sensitive files, use a VPN.

**Q: Can I run Fluxa on Windows?**  
A: Yes! Build with `cargo build --release` on Windows and run the `.exe` similarly.

**Q: Can multiple people connect at the same time?**  
A: Yes. Multiple WebSocket clients and sessions are supported concurrently.

**Q: How do I stop Fluxa?**  
A: Press `Ctrl+C` in the terminal where it's running.

**Q: Where are uploaded files saved?**  
A: Files are saved in the destination folder you were browsing in the UI. If no folder is specified in the API, files go to `FLUXA_ROOT/Downloads/`.

---

## Keyboard Shortcuts (File Explorer)

| Action | Shortcut |
|---|---|
| Confirm rename / folder creation | `Enter` |
| Cancel rename / folder creation | `Escape` |
| Open context menu | Right-click |
| Select file | Left-click |

---

## Getting Help

- Check [docs/api.md](api.md) for the full API reference
- Check [README.md](../README.md) for architecture details
- Open an issue on the project repository

---

*Fluxa v0.1.0 – Built with ❤️ in Rust + React*
