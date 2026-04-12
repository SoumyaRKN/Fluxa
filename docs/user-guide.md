# Fluxa – Beginner's User Guide

Welcome! This guide will walk you through everything you need to know to use Fluxa — from first launch to advanced features. No prior experience needed.

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
