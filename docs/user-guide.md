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
   - [Fedora / RHEL / CentOS](#fedora--rhel--centos)
   - [Arch Linux / Manjaro](#arch-linux--manjaro)
   - [macOS](#macos)
   - [Windows (native)](#windows-native)
   - [Windows — WSL2](#windows--wsl2)
   - [Raspberry Pi / ARM Linux](#raspberry-pi--arm-linux)
   - [NAS / Headless Server](#nas--headless-server)
   - [Android — Full Peer via Termux](#android--full-peer-via-termux)
   - [iOS — Options and Limitations](#ios--options-and-limitations)
   - [Chromebook — Full Peer via Linux Container](#chromebook--full-peer-via-linux-container)
5. [Accessing Fluxa from any device (browser only)](#accessing-fluxa-from-any-device-browser-only)
   - [iOS (iPhone / iPad) — browser client](#ios-iphone--ipad--browser-client)
   - [Android — browser client](#android--browser-client)
   - [Another PC or Mac](#another-pc-or-mac)
   - [Smart TV / Fire TV / Streaming Device](#smart-tv--fire-tv--streaming-device)
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

> **You do not need to know programming or install any development tools.**
> Fluxa ships as a single pre-built binary. Just download it and run it.
>
> The "Build from source" steps at the end of each section are optional — only needed if your platform isn't in the release list or you want to modify Fluxa.

---

### Quick Install (All Platforms)

#### Linux / macOS — one command

Open a terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
```

The script downloads the right binary for your machine, installs it to `~/.local/bin`, and prints what to do next. Done.

#### Windows — one command

Open **PowerShell** (press Win+R → type `powershell` → Enter) and run:

```powershell
irm https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.ps1 | iex
```

A desktop shortcut **Fluxa** is created. Double-click it to start.

#### Android (Termux)

1. Install **Termux** from F-Droid (not Play Store) — see the [Android section](#android--full-peer-via-termux) for details
2. In Termux, run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install-termux.sh | bash
   ```

#### Manual download (no terminal required)

If you prefer to download manually:

1. Go to **<https://github.com/SoumyaRKN/Fluxa/releases/latest>**
2. Download the file for your platform:

   | Your device | File to download |
   |-------------|-----------------|
   | Linux (64-bit PC) | `fluxa-linux-x86_64.tar.gz` |
   | Linux (ARM64, e.g. Raspberry Pi 4/5) | `fluxa-linux-aarch64.tar.gz` |
   | macOS (Intel) | `fluxa-macos-x86_64.tar.gz` |
   | macOS (Apple Silicon — M1/M2/M3/M4) | `fluxa-macos-aarch64.tar.gz` |
   | Windows | `fluxa-windows-x86_64.zip` |
   | Android (most phones, ARM64) | `fluxa-android-aarch64.tar.gz` |

3. Extract the archive:
   - **Windows:** right-click the ZIP → "Extract All" → open the folder → run `fluxa.exe`
   - **Linux/macOS:** open a terminal in the folder:

     ```bash
     tar -xzf fluxa-*.tar.gz
     chmod +x fluxa
     ./fluxa
     ```

4. Open **<http://localhost:7070>** in your browser.

---

### After starting Fluxa

No matter how you installed it, the experience is the same:

1. Fluxa starts and prints the URL it's listening on
2. Open **<http://localhost:7070>** on the same machine — you see your files
3. Find your machine's IP address to share with other devices on your network:
   - **Linux/macOS:** run `ip addr` or `ifconfig`
   - **Windows:** run `ipconfig` in PowerShell
   - **Or:** click the **QR code** button in Fluxa — scan it with any phone
4. On other devices: open a browser → type `http://YOUR_IP:7070`

---

### Per-platform details (optional reading)

The sections below explain per-platform specifics — firewall rules, background services, extra configuration, and how to build from source if you need to. **You don't need to read them to get started.**

---

### Ubuntu / Debian / Linux

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

#### Install (recommended — no build required)

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
fluxa
```

Open **<http://localhost:7070>**. Done.

#### Find your LAN IP (for other devices to connect)

```bash
ip addr show | grep "inet " | grep -v "127.0.0.1"
# Example: inet 192.168.1.42/24 ...
```

Other devices on the same network open `http://192.168.1.42:7070`.

#### Open firewall (if UFW is active)

```bash
sudo ufw allow 7070/tcp comment "Fluxa HTTP"
sudo ufw allow 5353/udp comment "Fluxa mDNS discovery"
```

#### Run as a service (starts at boot)

```bash
sudo tee /etc/systemd/system/fluxa.service > /dev/null << EOF
[Unit]
Description=Fluxa LAN File Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
ExecStart=$(which fluxa)
Environment=FLUXA_ROOT=/home/$USER
Environment=FLUXA_PORT=7070
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now fluxa
sudo systemctl status fluxa    # should say "active (running)"
```

#### Build from source (optional — only if you want to modify Fluxa)

<details>
<summary>Click to expand source build instructions</summary>

##### Prerequisites

| Requirement | Minimum | Check |
|------------|---------|-------|
| Rust toolchain | 1.75+ | `rustc --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

#### Step 1 — Install dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# At the prompt, press 1 (default install) then Enter
source "$HOME/.cargo/env"   # or open a new terminal

# Verify
node --version   # v20.x.x
rustc --version  # rustc 1.75+
```

#### Step 2 — Get Fluxa and build it

```bash
# Clone the repo (or extract a downloaded archive)
git clone https://github.com/SoumyaRKN/Fluxa.git
cd Fluxa

# Build frontend (outputs to backend/public/)
cd frontend
npm install
npm run build
cd ..

# Build backend binary (~2–4 min first time)
cd backend
cargo build --release
```

The binary is now at `backend/target/release/fluxa`.

#### Step 3 — Run Fluxa

```bash
cd Fluxa/backend
./target/release/fluxa
```

You should see:

```
INFO fluxa_backend: Starting Fluxa backend
INFO fluxa_backend:   Device name : your-hostname
INFO fluxa_backend:   Root dir    : /home/youruser
INFO fluxa_backend:   Bind        : 0.0.0.0:7070
INFO fluxa_backend: Fluxa listening on http://0.0.0.0:7070
```

Open **<http://localhost:7070>** — you should see the Fluxa UI with your home directory listed.

#### Step 4 — Find your LAN IP (for other devices to connect)

```bash
ip addr show | grep "inet " | grep -v "127.0.0.1"
# Example output:  inet 192.168.1.42/24 brd ...
```

Your LAN URL is `http://192.168.1.42:7070`. Any device on the same network can open this.

#### Step 5 — Open firewall (if UFW is enabled)

```bash
sudo ufw allow 7070/tcp comment "Fluxa HTTP"
sudo ufw allow 5353/udp comment "Fluxa mDNS discovery"
```

#### Step 6 — Run as a service (starts at boot)

```bash
# Install the binary system-wide
sudo cp backend/target/release/fluxa /usr/local/bin/fluxa

# Create the service file
sudo tee /etc/systemd/system/fluxa.service > /dev/null << EOF
[Unit]
Description=Fluxa LAN File Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/fluxa
WorkingDirectory=/usr/local/bin
Environment=FLUXA_ROOT=/home/$USER
Environment=FLUXA_PORT=7070
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now fluxa
sudo systemctl status fluxa    # should say "active (running)"
```

</details>

---

### Fedora / RHEL / CentOS

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

#### Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
fluxa
```

Open **<http://localhost:7070>**. LAN IP: `ip addr show | grep "inet "`.

Firewall (if firewalld is active): `sudo firewall-cmd --permanent --add-port=7070/tcp && sudo firewall-cmd --reload`

<details>
<summary>Build from source (optional)</summary>

#### Step 1 — Install dependencies

```bash
sudo dnf install -y nodejs git

# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify
node --version && rustc --version
```

#### Step 2 — Build and run

```bash
git clone https://github.com/SoumyaRKN/Fluxa.git && cd Fluxa
cd frontend && npm install && npm run build && cd ..
cd backend && cargo build --release
./target/release/fluxa
```

Open **<http://localhost:7070>**. Your LAN IP: `ip addr show | grep "inet "`.

#### Step 3 — Firewall (firewalld)

```bash
sudo firewall-cmd --permanent --add-port=7070/tcp
sudo firewall-cmd --permanent --add-port=5353/udp
sudo firewall-cmd --reload
```

#### Step 4 — Service at boot (same as Ubuntu Step 6 above)

```bash
sudo cp backend/target/release/fluxa /usr/local/bin/fluxa
# Then create the systemd service as shown in the Ubuntu section
sudo systemctl enable --now fluxa
```

</details>

---

### Arch Linux / Manjaro

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

#### Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
fluxa
```

Open **<http://localhost:7070>**. LAN IP: `ip addr show | grep "inet "`.

<details>
<summary>Build from source (optional)</summary>

#### Step 1 — Install dependencies

```bash
sudo pacman -S --noconfirm nodejs npm git rustup
rustup default stable

# Verify
node --version && rustc --version
```

#### Step 2 — Build and run

```bash
git clone https://github.com/SoumyaRKN/Fluxa.git && cd Fluxa
cd frontend && npm install && npm run build && cd ..
cd backend && cargo build --release
./target/release/fluxa
```

Open **<http://localhost:7070>**. Your LAN IP: `ip addr show | grep "inet "`.

No separate firewall step needed on a default Arch install (no firewall is active by default).  
If you use `ufw` or `nftables`, allow TCP 7070 and UDP 5353.

</details>

---

### macOS

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

Tested on macOS 12 Monterey, 13 Ventura, 14 Sonoma, 15 Sequoia (Intel and Apple Silicon).

#### Quick install

Open **Terminal** (Cmd+Space → type "Terminal" → Enter):

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
fluxa
```

macOS will ask: *"Do you want the application 'fluxa' to accept incoming network connections?"* — click **Allow**.

Open **<http://localhost:7070>**. Find your LAN IP: `ipconfig getifaddr en0` (Wi-Fi).

**Launch at login:** The installer sets this up automatically. To do it manually, see the details below.

<details>
<summary>Build from source / launch agent setup (optional)</summary>

#### Step 1 — Install Homebrew

Open **Terminal** (Cmd+Space → type "Terminal" → Enter):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, the tool prints "Next steps:" — follow them to add `brew` to your PATH.  
On Apple Silicon this typically means adding a line to `~/.zprofile`. Do that, then open a new Terminal window.

#### Step 2 — Install dependencies

```bash
brew install node rustup git
rustup-init    # press 1 (default), then Enter

# Reload shell environment
source "$HOME/.cargo/env"

# Verify
node --version    # v20.x.x or later
rustc --version   # rustc 1.75+
```

#### Step 3 — Build Fluxa

```bash
cd /path/to/Fluxa
cd frontend && npm install && npm run build && cd ..
cd backend && cargo build --release
```

On **Apple Silicon (M-series)** Rust compiles native ARM64 — fast.  
On **Intel** Macs it targets x86_64.

#### Step 4 — Run Fluxa and allow the firewall

```bash
./target/release/fluxa
```

macOS will show a dialog:

> *"Do you want the application 'fluxa' to accept incoming network connections?"*

Click **Allow**. This is required every time a new binary is built (the hash changes).

Open **<http://localhost:7070>** in Safari or Chrome.

#### Step 5 — Find your LAN IP

```bash
ipconfig getifaddr en0    # Wi-Fi
ipconfig getifaddr en1    # Ethernet (if connected)
# or show all:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Other devices on the same network open `http://YOUR_MAC_IP:7070`.

#### Step 6 — Launch at login (optional)

```bash
mkdir -p "$HOME/Library/LaunchAgents"
FLUXA_PATH="$(pwd)/target/release/fluxa"

cat > "$HOME/Library/LaunchAgents/app.fluxa.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>          <string>app.fluxa</string>
  <key>ProgramArguments</key>
  <array>
    <string>$FLUXA_PATH</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$(pwd)</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>FLUXA_ROOT</key> <string>$HOME</string>
  </dict>
  <key>RunAtLoad</key>   <true/>
  <key>KeepAlive</key>   <true/>
  <key>StandardOutPath</key>  <string>/tmp/fluxa.log</string>
  <key>StandardErrorPath</key><string>/tmp/fluxa.log</string>
</dict>
</plist>
EOF

launchctl load "$HOME/Library/LaunchAgents/app.fluxa.plist"
```

Fluxa now starts automatically every time you log in.

</details>

---

### Windows (native)

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

Tested on Windows 10 (20H2+) and Windows 11.

#### Quick install

Open **PowerShell** (press Win+R → type `powershell` → Enter):

```powershell
irm https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.ps1 | iex
```

A **Fluxa** shortcut is created on your desktop. Double-click it to start.  
Or: open PowerShell and type `fluxa` after the install finishes.

Windows Firewall will show a dialog the first time — tick **both** checkboxes (Private + Public) and click **Allow access**.

Find your LAN IP: open PowerShell → `ipconfig` → look for IPv4 Address under your Wi-Fi adapter.

<details>
<summary>Build from source / Task Scheduler setup (optional)</summary>

#### Step 1 — Install prerequisites

**Rust:**

1. Go to **<https://rustup.rs>** in your browser
2. Click **"DOWNLOAD RUSTUP-INIT.EXE"**
3. Run the downloaded file
4. At the prompt press `1` (default install) → Enter
5. Wait for the installation to finish

**Node.js:**

1. Go to **<https://nodejs.org>** → click **"LTS"** to download
2. Run the installer
3. On the "Tools for Native Modules" page, **tick** "Automatically install the necessary tools" (important for native addons)
4. Complete the wizard

**Git (optional but useful):**

1. Go to **<https://git-scm.com/download/win>** → download
2. Run installer, accept all defaults

**Restart PowerShell** after all installs so the new PATH entries take effect.

Verify in a new PowerShell window:

```powershell
node --version    # v20.x.x
rustc --version   # rustc 1.75+
```

#### Step 2 — Build Fluxa

Open **PowerShell** (not CMD):

```powershell
cd C:\path\to\Fluxa

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build backend (first build ~5-10 min)
cd backend
cargo build --release
```

The binary appears at `backend\target\release\fluxa.exe`.

#### Step 3 — Run Fluxa and allow the firewall

```powershell
cd C:\path\to\Fluxa\backend
.\target\release\fluxa.exe
```

Windows will show a **Windows Defender Firewall** dialog:

> *"Windows Defender Firewall has blocked some features of fluxa.exe"*

**Tick both checkboxes:**

- ✅ Private networks, such as my home or work network
- ✅ Public networks, such as those in airports and coffee shops

Then click **"Allow access"**.

> If you accidentally clicked "Cancel" and no dialog appeared, add the rule manually:  
> Start → "Windows Defender Firewall with Advanced Security" → Inbound Rules → New Rule → Program → browse to `fluxa.exe` → Allow → apply to all network types → name it "Fluxa".

Open **<http://localhost:7070>** in Edge or Chrome.

#### Step 4 — Find your LAN IP

```powershell
ipconfig
```

Look for `IPv4 Address` under your Wi-Fi or Ethernet adapter:

```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . : 192.168.1.42
```

Other devices use `http://192.168.1.42:7070`.

#### Step 5 — Auto-start with Windows (optional)

**Simple shortcut method:**

1. Press **Win+R** → type `shell:startup` → Enter
2. Right-click → **New → Shortcut**
3. Target: `C:\path\to\Fluxa\backend\target\release\fluxa.exe`
4. Click Next → name it "Fluxa" → Finish
5. Right-click the shortcut → Properties → Start In: `C:\path\to\Fluxa\backend`

Fluxa will now launch in a terminal window whenever you log in.

**Background service via Task Scheduler (no window):**

1. Open **Task Scheduler** (search in Start menu)
2. Action → Create Basic Task → name "Fluxa" → Next
3. Trigger: "When I log on" → Next
4. Action: "Start a program" → Next  
   Program: `C:\path\to\Fluxa\backend\target\release\fluxa.exe`  
   Start in: `C:\path\to\Fluxa\backend`
5. Finish → right-click the task → Properties  
   → General tab → tick "Run whether user is logged on or not"  
   → tick "Run with highest privileges" → OK

</details>

---

### Windows — WSL2

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

Use this if you prefer a Linux environment on Windows. WSL2 runs a real Linux kernel.

#### Quick install

1. Enable WSL2 (one-time, PowerShell as Administrator): `wsl --install` → reboot
2. In the Ubuntu terminal that opens after reboot:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
   fluxa
   ```

3. From other LAN devices: follow the port-proxy steps in the details below.

<details>
<summary>Port proxy setup / build from source (optional)</summary>

#### Step 1 — Enable WSL2

Open PowerShell **as Administrator**:

```powershell
wsl --install
```

Reboot when prompted. After reboot, a Ubuntu terminal window opens automatically and finishes setup (enter a username and password).

If WSL is already installed but you need Ubuntu:

```powershell
wsl --install -d Ubuntu
wsl --set-default-version 2
```

#### Step 2 — Build and run Fluxa inside WSL2

Open the **Ubuntu** terminal (search "Ubuntu" in Start menu). Then follow the **Ubuntu / Debian / Linux** steps above exactly — the environment is a real Ubuntu.

```bash
# All steps identical to Ubuntu section:
sudo apt update && sudo apt install -y nodejs git
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
git clone https://github.com/SoumyaRKN/Fluxa.git && cd Fluxa
cd frontend && npm install && npm run build && cd ..
cd backend && cargo build --release
./target/release/fluxa
```

On Windows 11, open `http://localhost:7070` in Edge — WSL2 ports are forwarded automatically.

#### Step 3 — Access from other LAN devices

WSL2 uses a private virtual network (`172.x.x.x`). Other devices on your LAN cannot reach it directly. Set up a port proxy from Windows PowerShell (as Administrator):

First, get the WSL2 IP from inside the Ubuntu terminal:

```bash
ip addr show eth0 | grep "inet "
# inet 172.24.x.x/20 ...   ← this is your WSL2 IP
```

Then in PowerShell (Admin):

```powershell
# Replace 172.24.x.x with your actual WSL2 IP
netsh interface portproxy add v4tov4 `
  listenaddress=0.0.0.0 `
  listenport=7070 `
  connectaddress=172.24.x.x `
  connectport=7070

# Open the Windows firewall for this port
netsh advfirewall firewall add rule `
  name="Fluxa WSL2" `
  dir=in action=allow protocol=TCP localport=7070
```

Now other devices on your LAN can reach Fluxa at your **Windows machine's IP** on port 7070.

Find your Windows IP in PowerShell:

```powershell
ipconfig | findstr "IPv4"
```

> **Windows 11 shortcut:** Use mirrored networking to skip the port proxy entirely. In your Windows home directory, create or edit `.wslconfig`:
>
> ```ini
> [wsl2]
> networkingMode=mirrored
> ```
>
> Save and run `wsl --shutdown`, then restart WSL2. Now WSL2 shares your Windows network interface and is directly reachable at the same IP.

</details>

---

### Raspberry Pi / ARM Linux

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

Tested on Raspberry Pi 3B+, 4, 5 running Raspberry Pi OS Bookworm (64-bit) and Ubuntu Server 24.04.

#### Quick install

SSH into your Pi (or open a terminal on it directly), then:

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
fluxa
```

Find the Pi's IP to share with other devices: `hostname -I`

To run Fluxa automatically at every boot, follow the systemd steps in the details below.

<details>
<summary>Headless setup / systemd service / build from source (optional)</summary>

#### Step 1 — Set up the Pi (headless / no monitor)

Use **Raspberry Pi Imager** (<https://raspberrypi.com/software/>) on your main PC:

1. Download and run Raspberry Pi Imager
2. Choose OS → **Raspberry Pi OS (64-bit)** (or Ubuntu Server 24.04 for Pi 4/5)
3. Choose your SD card
4. Click the **gear icon** (⚙) to open Advanced Options:
   - ✅ Enable SSH → Use password authentication
   - ✅ Set username and password (remember these)
   - ✅ Configure wireless LAN → enter your Wi-Fi name and password
   - ✅ Set locale and timezone
5. Click **Write** and wait
6. Insert SD card, power on the Pi

#### Step 2 — SSH into the Pi from your main computer

On your main computer (Linux/Mac Terminal or Windows PowerShell):

```bash
ssh pi@raspberrypi.local
# Use the username and password you set in Imager
# If .local doesn't resolve, find the IP in your router's device list instead
```

You're now inside the Pi.

#### Step 3 — Install dependencies on the Pi

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Rust (native ARM — compiles natively, no emulation)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify
node --version && rustc --version
```

#### Step 4 — Build Fluxa

```bash
git clone https://github.com/SoumyaRKN/Fluxa.git
cd Fluxa
cd frontend && npm install && npm run build && cd ..
cd backend && cargo build --release
```

Expected build times:

| Board | First `cargo build --release` |
|-------|-------------------------------|
| Raspberry Pi 5 | ~6 min |
| Raspberry Pi 4 (4 GB) | ~15 min |
| Raspberry Pi 3B+ | ~35 min |
| Pi Zero 2 W | ~50 min |

Grab a coffee. It only happens once.

#### Step 5 — Run Fluxa

```bash
# Find your Pi's IP address first
hostname -I    # shows all IPs (Wi-Fi and Ethernet)

# Run Fluxa (sharing the Pi's home directory)
cd ~/Fluxa/backend
FLUXA_ROOT=/home/pi FLUXA_DEVICE_NAME="Raspberry Pi" ./target/release/fluxa
```

From any device on your network: `http://PI_IP:7070`

#### Step 6 — Run as a service (auto-starts at boot, survives SSH disconnect)

```bash
sudo cp ~/Fluxa/backend/target/release/fluxa /usr/local/bin/fluxa

sudo tee /etc/systemd/system/fluxa.service > /dev/null << 'EOF'
[Unit]
Description=Fluxa LAN File Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/fluxa
WorkingDirectory=/usr/local/bin
Environment=FLUXA_ROOT=/home/pi
Environment=FLUXA_PORT=7070
Environment=FLUXA_DEVICE_NAME=RaspberryPi
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now fluxa
sudo systemctl status fluxa    # should say "active (running)"
```

The Pi is now always on the LAN as a discoverable file server. No one needs to be logged in.

#### Optional — Serve files from an external USB drive

```bash
# Find the drive
lsblk

# Mount it
sudo mkdir -p /mnt/usb
sudo mount /dev/sda1 /mnt/usb

# Run Fluxa pointing at the USB drive
FLUXA_ROOT=/mnt/usb ./target/release/fluxa

# To auto-mount at boot, add to /etc/fstab:
# /dev/sda1  /mnt/usb  auto  defaults,nofail  0  0
```

</details>

---

### NAS / Headless Server

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

This covers any always-on Linux server: home NAS boxes, old laptops repurposed as servers, Synology/QNAP via SSH, TrueNAS SCALE, Ubuntu Server, etc.

#### Quick install (native Linux NAS or server)

SSH into the server and run:

```bash
curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
FLUXA_ROOT=/path/to/share fluxa
```

For NAS devices where the install script can’t run (no curl/bash), download the matching binary from [GitHub Releases](https://github.com/SoumyaRKN/Fluxa/releases/latest), copy it to the NAS, and run it directly.

<details>
<summary>Synology, QNAP, multi-instance, build from source (optional)</summary>

#### Approach 1 — Native Linux NAS (or any Linux server)

Follow the **Ubuntu / Debian** steps. For permanent operation, use the systemd service method so Fluxa starts at boot and runs without anyone logged in.

Point `FLUXA_ROOT` at your share directory:

```bash
# Example: serve your media library
FLUXA_ROOT=/srv/media FLUXA_DEVICE_NAME="Media NAS" /usr/local/bin/fluxa
```

Multiple instances on different ports for different shares:

```bash
FLUXA_ROOT=/srv/documents FLUXA_PORT=7070 /usr/local/bin/fluxa &
FLUXA_ROOT=/srv/media     FLUXA_PORT=7071 /usr/local/bin/fluxa &
```

#### Approach 2 — Synology NAS (via SSH)

1. In DSM, go to **Control Panel → Terminal & SNMP → Enable SSH**
2. SSH in: `ssh admin@synology.local`
3. Because Synology runs a custom Linux on x86_64 or ARM64, build the binary on a **matching architecture** machine and scp it over:

   ```bash
   # On your Linux PC (same architecture as the NAS):
   cargo build --release
   scp backend/target/release/fluxa admin@synology.local:/volume1/@appstore/fluxa/
   ```

4. On the NAS via SSH:

   ```bash
   chmod +x /volume1/@appstore/fluxa/fluxa
   FLUXA_ROOT=/volume1/shares /volume1/@appstore/fluxa/fluxa &
   ```

5. To start at boot: create a **Triggered Task** in DSM Task Scheduler (Control Panel → Task Scheduler → Create → Triggered Task → Boot-up) that runs:

   ```bash
   FLUXA_ROOT=/volume1/shares /volume1/@appstore/fluxa/fluxa >> /volume1/logs/fluxa.log 2>&1 &
   ```

#### Approach 3 — QNAP NAS

1. Enable **SSH** in QNAP's Control Panel → Network & Virtual Switch → Services → SSH
2. SSH in: `ssh admin@qnap.local`
3. Copy the x86_64 binary (built on a Linux PC):

   ```bash
   scp backend/target/release/fluxa admin@qnap.local:/share/Public/fluxa
   ```

4. On the QNAP:

   ```bash
   chmod +x /share/Public/fluxa
   FLUXA_ROOT=/share/Public /share/Public/fluxa &
   ```

5. For auto-start, add to QNAP's autorun.sh:

   ```bash
   echo 'FLUXA_ROOT=/share/Public /share/Public/fluxa >> /share/Public/fluxa.log 2>&1 &' \
     >> /etc/config/autorun.sh
   ```

</details>

---

### Android — Full Peer via Termux

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

Termux gives Android a real Linux environment with native ARM binaries. Your Android device becomes a **full Fluxa peer** — visible to other devices via mDNS, with browsable files, full bi-directional transfers.

#### Quick install

1. Install **Termux** from **F-Droid** (visit <https://f-droid.org> on your phone — NOT the Play Store)
2. Open Termux and run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install-termux.sh | bash
   ```

   The script handles everything: storage access, download, and auto-start setup.

3. Run `bash ~/start-fluxa.sh` — Fluxa starts and prints your phone's IP
4. From any PC/browser on the same Wi-Fi: `http://PHONE_IP:7070`

> **Why F-Droid?** The Termux app on the Play Store is years out of date with broken packages. F-Droid has the current version.

<details>
<summary>Manual step-by-step setup / build from source (optional)</summary>

#### Step 1 — Install Termux from F-Droid

> ⚠️ **Critical: Do NOT install Termux from the Google Play Store.** The Play Store version is years out of date and broken. Use F-Droid.

1. On your Android device, open Chrome and visit **<https://f-droid.org>**
2. Tap **"Download F-Droid"** — it downloads an APK file
3. Tap the downloaded APK → Android asks "Allow installs from Chrome" → tap **Settings** → enable it → go back → tap **Install**
4. Open **F-Droid** → wait for the repository index to load (pull down to refresh if needed)
5. Tap the search 🔍 icon → type "Termux" → install the Termux package (by "Termux" — not clones)

While in F-Droid, also install:

- **Termux:Boot** — allows Termux scripts to run at boot
- **Termux:API** — optional device integration (battery info, notifications, etc.)

#### Step 2 — First-time Termux setup

Open the Termux app. You'll see a terminal prompt. Run:

```bash
# Update the package manager and all existing packages
pkg update && pkg upgrade -y
# (Say Y to any prompts)

# Grant storage access — ESSENTIAL
termux-setup-storage
```

Android will show a permission dialog: **"Allow Termux to access photos, media, and files"** — tap **Allow**.

Without this, Fluxa cannot see your phone's storage.

Verify access:

```bash
ls ~/storage/
# You should see: dcim  downloads  movies  music  pictures  shared
```

Android's entire user-accessible storage is at `~/storage/shared/`.

#### Step 3 — Disable battery optimization for Termux

Android's battery optimizer will kill Termux while it's running. Fix this before building:

1. Android Settings → **Battery** (or "Battery & performance")
2. Find **Battery Optimization** or **App Battery Usage**
3. Find **Termux** → set to **"Don't optimize"** or **"Unrestricted"**

The exact menu path varies by Android version and manufacturer, but search for "battery optimization" in your settings search.

#### Step 4 — Install development tools

```bash
pkg install rust nodejs git binutils -y
```

- `rust` — the Rust compiler (native ARM64 — compiles real binaries, not emulated)
- `nodejs` — for building the React frontend
- `git` — to clone the repository
- `binutils` — required linker tools for Rust on Android

> **Installation time:** The Rust package takes 2–4 minutes to download and install.  
> First `cargo build --release` takes **20–45 minutes** depending on your phone.  
> This only happens once — future builds are seconds.

#### Step 5 — Clone and build Fluxa

```bash
# Clone the repository
git clone https://github.com/SoumyaRKN/Fluxa.git
cd Fluxa

# Build the frontend
cd frontend
npm install
npm run build    # ~2–3 minutes
cd ..

# Build the backend
cd backend
cargo build --release    # ~20–45 minutes on first build
```

If you see linker errors like `cannot find -lc`, run `pkg install binutils ldd` and retry.

#### Step 6 — Run Fluxa on your phone

```bash
cd ~/Fluxa/backend

# Find your phone's Wi-Fi IP
ip addr show wlan0 | grep "inet "
# Example: inet 192.168.1.55/24 ...

# Run Fluxa, sharing all internal storage
FLUXA_ROOT=$HOME/storage/shared \
FLUXA_DEVICE_NAME="My Android" \
./target/release/fluxa
```

You should see:

```
INFO fluxa_backend: Fluxa listening on http://0.0.0.0:7070
```

From any PC/laptop/tablet on the same Wi-Fi: **<http://192.168.1.55:7070>** — full browser UI showing your phone's files.

Your phone also appears in the **Devices panel** of any other Fluxa instance auto-discovered via mDNS.

#### Step 7 — Keep Fluxa running when the screen turns off

Android suspends background processes. To prevent this:

```bash
# Acquire a CPU wake lock (run before launching Fluxa)
termux-wake-lock

# Then launch in background
FLUXA_ROOT=$HOME/storage/shared \
FLUXA_DEVICE_NAME="My Android" \
./target/release/fluxa &
```

Keep the Termux notification visible in your notification bar — swiping it away lets Android kill the process.

#### Step 8 — Auto-start at every boot (via Termux:Boot)

Requires Termux:Boot installed from F-Droid and opened at least once.

```bash
mkdir -p ~/.termux/boot

cat > ~/.termux/boot/fluxa.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/Fluxa/backend
FLUXA_ROOT=$HOME/storage/shared \
FLUXA_DEVICE_NAME="My Android" \
./target/release/fluxa >> ~/fluxa.log 2>&1
EOF

chmod +x ~/.termux/boot/fluxa.sh
```

Every reboot automatically starts Fluxa. Your phone is always a discoverable file server on the LAN.

#### Android storage paths

| Termux shortcut | Maps to on Android | Best for |
|-----------------|-------------------|---------|
| `~/storage/shared` | `/storage/emulated/0` — all internal storage | Share everything |
| `~/storage/downloads` | Downloads folder | Share downloads only |
| `~/storage/dcim` | DCIM / Camera | Browse phone photos from PC |
| `~/storage/pictures` | Pictures | Screenshots, gallery |
| `~/storage/music` | Music | Audio files |
| `~/storage/movies` | Movies/Videos | Video files |

#### Troubleshooting Android/Termux

| Problem | Solution |
|---------|---------|
| `pkg: command not found` | Open a fresh Termux session — run `apt update` first |
| Storage shows empty or permission denied | Re-run `termux-setup-storage`, grant the permission |
| Linker error during `cargo build` | Run `pkg install binutils ldd` then retry |
| Ran out of space during build | ~500 MB needed; clear space or move files to SD card |
| Fluxa stops when phone sleeps | Run `termux-wake-lock` before launching; disable battery optimization for Termux |
| mDNS / auto-discovery not working | Some Android versions block multicast. Connect by direct IP: `http://PHONE_IP:7070` |
| `getprop: not found` | Replace `$(getprop ro.product.model)` with a static name like `"MyPhone"` |
| Build takes too long | Normal on older phones. Patience — it only happens once |

</details>

---

### iOS — Options and Limitations

**Capability: ⚠️ No native server · ✅ Browser client (full UI)**

iOS is the most restrictive platform for running server software. Apple's sandbox and App Store rules prevent running persistent background TCP servers from third-party apps.

#### Understanding what's possible on iOS

| Goal | Possible? |
|------|----------|
| Browse another device's Fluxa files | ✅ Yes — open Safari, done |
| Upload files from iPhone to another Fluxa | ✅ Yes — browser upload works |
| Download files from another Fluxa to iPhone | ✅ Yes — saves to Files app |
| Run a Fluxa server so others can browse iPhone files | ⚠️ Limited — see iSH below |
| Auto-discovery via mDNS | ❌ Not possible from App Store apps |
| Keep the server running with screen off | ❌ iOS suspends all background apps |

---

#### Option A — Browser client (Recommended for all iOS users)

Zero installation, full UI, works on every iPhone and iPad.

**Steps:**

1. Make sure your iPhone/iPad is on the **same Wi-Fi** as the Fluxa host machine
2. Connect using the fastest method:
   - **QR code:** On the host machine, click the QR icon in Fluxa's toolbar → scan with your iPhone Camera app → tap the link
   - **Direct URL:** Open **Safari** → type `http://HOST_IP:7070`
3. The Fluxa UI loads — you can:
   - **Browse** all files on the host machine
   - **Download** files to your iPhone: they save to the Files app under Downloads
   - **Upload** from iPhone: tap the ↑ Upload button → iOS file picker appears → choose from Files, Photos, iCloud Drive, Dropbox, etc.
   - **Preview** images, videos, PDFs, text files in-browser

**Add to Home Screen for app-like access:**
In Safari, tap the Share button (box with arrow) → **"Add to Home Screen"** → Add. You get a Fluxa icon that opens directly to the file explorer.

---

#### Option B — iSH Shell (serve files from iPhone to others)

**[iSH](https://apps.apple.com/app/ish-shell/id1436902243)** emulates an x86 CPU in software and runs Alpine Linux inside the iOS app sandbox.

**What you must accept before using iSH:**

- ⚠️ x86 emulation is **10–50× slower** than native hardware — do not try to build Rust here
- ⚠️ iOS suspends iSH ~30 seconds after the app is backgrounded — keep the app open
- ⚠️ iSH can only access files inside its own sandbox + Files.app locations you explicitly share with it
- ⚠️ mDNS does not work — other devices cannot auto-discover you, but they can connect by direct IP
- ⚠️ The server stops when iSH is backgrounded

**Install iSH:**

1. Open the App Store → search **"iSH Shell"** → install it (free)
2. Open iSH → you see an Alpine Linux prompt

**Install Node.js and a static file server:**

```sh
apk update && apk add nodejs npm
npm install -g serve
```

**Share files from iSH:**

1. In iSH, go to **Settings** (top-right gear) → **"Enable Files.app integration"** — this mounts your iSH filesystem in the iOS Files app, letting you copy files into it from iCloud/Downloads/etc.
2. Copy files you want to share into the iSH home directory using the Files app
3. Serve them:

   ```sh
   cd ~
   serve -p 7070 .
   ```

4. Find your iPhone's IP: **iOS Settings → Wi-Fi → tap your network name → IP Address**
5. From another device on the same Wi-Fi: `http://IPHONE_IP:7070` — shows a basic file listing with download links

**This is not the full Fluxa experience** — no file management UI, no transfers panel, no mDNS. For the full experience, use **Option A**.

---

### Chromebook — Full Peer via Linux Container

**Full capability: ✅ Server · ✅ Discovery · ✅ Transfers · ✅ Browser**

Requires ChromeOS 69+ (nearly all Chromebooks sold from 2018 onwards).

#### Quick install

1. Enable Linux: **Settings → Advanced → Developers → Linux development environment → Turn On** (allocate at least 5 GB)
2. Open the **Terminal** app that appears in your launcher and run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.sh | bash
   fluxa
   ```

3. Open Chrome → go to **<http://localhost:7070>** — it works immediately
4. Other devices on your network use your Chromebook's Wi-Fi IP (find it in ChromeOS Settings → Network)

<details>
<summary>Port forwarding / Google Drive access / build from source (optional)</summary>

#### Step 1 — Enable Linux development environment (Crostini)

1. Click the system clock (bottom-right) → **Settings** (gear icon)
2. In the left sidebar: **Advanced → Developers**
3. Find **"Linux development environment"** → click **Turn On**
4. A setup wizard opens — choose at least **5 GB** of disk space for Fluxa builds
5. Wait for the environment to install (3–5 minutes)
6. A **Terminal** app now appears in your app launcher

#### Step 2 — Inside the Linux terminal

The Chromebook Linux container is Debian-based. Run exactly the Ubuntu steps:

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Build
git clone https://github.com/SoumyaRKN/Fluxa.git
cd Fluxa
cd frontend && npm install && npm run build && cd ..
cd backend && cargo build --release
```

#### Step 3 — Run Fluxa on the Chromebook

```bash
./target/release/fluxa
```

Open **Chrome** (the regular Chromebook browser) → go to **<http://localhost:7070>**.  
It works — ChromeOS automatically forwards localhost ports from the Linux container to the Chrome browser.

#### Step 4 — Find the Chromebook's LAN IP (for other devices)

ChromeOS Settings → **Network** → Wi-Fi → tap your network name — note the **IP address** (e.g., `192.168.1.30`).

Other devices on your network open `http://192.168.1.30:7070`.

> **If it doesn't work:** Go to ChromeOS Settings → **Linux** → **Port forwarding** → click **Add** → forward port `7070` (TCP). Then retry.

#### Step 5 — Access your Files app and Google Drive from Fluxa

By default Fluxa only sees the Linux container's own filesystem. To access your Chromebook Downloads, Google Drive, etc.:

```bash
ls /mnt/chromeos/
# GoogleDrive/  MyFiles/  removable/

# Share your Downloads folder
FLUXA_ROOT=/mnt/chromeos/MyFiles/Downloads ./target/release/fluxa

# Or share everything accessible from ChromeOS
FLUXA_ROOT=/mnt/chromeos ./target/release/fluxa
```

</details>

---

## Accessing Fluxa from any device (browser only)

Once Fluxa is running on a host machine, **any device with a modern browser** can connect — no app install, no account, no software.

### Find the host's IP address

| Platform | How to find the LAN IP |
|----------|----------------------|
| Linux | `ip addr show \| grep "inet "` — exclude `127.0.0.1` |
| macOS | `ipconfig getifaddr en0` (Wi-Fi) or `en1` (Ethernet) |
| Windows | `ipconfig` → "IPv4 Address" under your Wi-Fi adapter |
| Raspberry Pi | `hostname -I` |
| Android (Termux) | `ip addr show wlan0 \| grep "inet "` |

Example: IP is `192.168.1.42` → connect to **<http://192.168.1.42:7070>**.

> **Fastest method:** Click the **QR Code** button in Fluxa's toolbar → scan with any phone camera → browser opens the correct URL instantly.

---

### iOS (iPhone / iPad) — browser client

**What works:** Browse · Download to iPhone · Upload from iPhone Photos/Files/iCloud · Preview images, videos, PDFs

1. Connect iPhone to the **same Wi-Fi** as the Fluxa host
2. Open **Camera** → scan the QR code shown in Fluxa → tap the notification  
   **or** open **Safari** → type `http://HOST_IP:7070`
3. The full Fluxa UI loads

**Uploading from iPhone:**

- Tap the ↑ Upload button in the toolbar
- iOS file picker appears — choose from **Files** (local + iCloud), **Photos**, Browse, etc.
- Files upload to the folder currently open in Fluxa on the host

**Downloading to iPhone:**

- Right-click (long-press) any file → **Download**
- Or double-tap to preview, then tap the Download button
- Files save to the **Downloads** folder in the iOS Files app

**Tip — Add to Home Screen:**  
Safari → Share button (□↑) → "Add to Home Screen" → Add. One-tap app-like access.

---

### Android — browser client

**What works:** Browse · Download to Android · Upload from Android · Preview

1. Connect to the same Wi-Fi as the Fluxa host
2. Open **Chrome** → navigate to `http://HOST_IP:7070`

**Uploading from Android:**

- Tap ↑ Upload → Android file picker opens
- Choose from Downloads, Photos (DCIM), Documents, SD card, Google Drive, etc.

**Downloading to Android:**

- Long-press a file → Download
- Chrome shows a notification when done; tap it to open the file

**Tip — Add to Home screen:**  
Chrome three-dot menu → "Add to Home screen" — gives you an app icon

---

### Another PC or Mac

1. Open any browser on the second machine
2. Navigate to `http://HOST_IP:7070`
3. Full Fluxa UI — browse, drag-and-drop upload, download, preview, manage files

Works in: Chrome, Firefox, Safari, Edge, Opera, Brave.

---

### Smart TV / Fire TV / Streaming Device

**What works:** Browse · Stream video and audio · Download

1. Open the TV's built-in browser:
   - **Samsung Smart TV:** Apps → Internet
   - **LG Smart TV:** Home → Web Browser
   - **Sony Android TV:** install Chrome from Play Store if available
   - **Amazon Fire TV:** open the Silk browser app
   - **Apple TV:** no browser — mirror an iPhone running Fluxa in Safari via AirPlay
2. Navigate to `http://HOST_IP:7070`
3. Double-click any video/audio file to stream it directly in the browser player

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
