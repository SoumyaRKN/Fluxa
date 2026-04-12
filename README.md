# Fluxa – LAN File Explorer & Transfer System

<div align="center">

<img src="frontend/src/assets/logo.svg" alt="Fluxa Logo" width="120" height="120" />

**High-performance, zero-install LAN file explorer & transfer system**

[![Rust](https://img.shields.io/badge/Rust-1.92+-orange?logo=rust)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06b6d4?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## What is Fluxa?

Fluxa is a **cross-platform, portable, LAN-based smart file explorer and transfer system**. It lets you browse files on any device in your home or office network, transfer large files at full LAN speed, and connect devices instantly via mDNS auto-discovery — all with no installation required on the receiving end.

> Open a browser. That's it.

---

## Features

| Feature | Status |
|---|---|
| File explorer (browse, create, delete, rename, copy) | ✅ |
| Upload files via drag-and-drop or file picker | ✅ |
| Download files from any device | ✅ |
| Chunked transfers with integrity check (SHA-256) | ✅ |
| mDNS auto device discovery (no manual IP needed) | ✅ |
| Consent-based connections (accept / reject) | ✅ |
| Real-time progress via WebSocket | ✅ |
| QR code for instant browser connection | ✅ |
| Dark-mode responsive web UI | ✅ |
| Single binary deployment (no install needed) | ✅ |

---

## Quick Start

### Prerequisites

- **Linux / macOS / Windows** (cross-platform)
- **Rust 1.75+** and **Node.js 18+** (only for building from source)
- Devices must be on the **same LAN / Wi-Fi network**

### Build & Run from Source

```bash
# Clone / navigate to project
cd Fluxa

# One-shot build + launch (builds frontend → backend → runs)
bash start.sh
```

Then open **<http://localhost:7070>** in your browser.

### Development Mode (hot reload)

```bash
# Backend auto-restarts on code change (requires cargo-watch)
# Frontend uses Vite HMR
bash dev.sh
```

Frontend is served at **<http://localhost:5173>** and proxies API calls to the backend.

### Using Make

```bash
make build    # Build both frontend and backend
make start    # Build + start production server
make dev      # Development mode
make clean    # Remove all build artifacts
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser / UI                      │
│         React + TypeScript + TailwindCSS 4           │
│           Vite · Zustand · TanStack Query            │
└────────────────────┬────────────────────────────────┘
                     │ HTTP REST  +  WebSocket (/ws)
┌────────────────────▼────────────────────────────────┐
│                   Fluxa Backend                      │
│              Rust · Axum 0.8 · Tokio                 │
│  ┌──────────┐ ┌───────────┐ ┌───────┐ ┌──────────┐  │
│  │ File API │ │ Transfer  │ │  WS   │ │ mDNS     │  │
│  │ CRUD ops │ │ Chunked   │ │ Events│ │ Discovery│  │
│  └──────────┘ └───────────┘ └───────┘ └──────────┘  │
└─────────────────────────────────────────────────────┘
                     │ mDNS (_fluxa._tcp.local.)
            Other Fluxa instances on LAN
```

---

## Configuration

Fluxa is configured via environment variables:

| Variable | Default | Description |
|---|---|---|
| `FLUXA_PORT` | `7070` | HTTP server port |
| `FLUXA_HOST` | `0.0.0.0` | Bind address |
| `FLUXA_ROOT` | `$HOME` | Root directory for file explorer |
| `FLUXA_DEVICE_NAME` | system hostname | Display name shown to peers |
| `RUST_LOG` | `fluxa_backend=info` | Log level |

Example:

```bash
FLUXA_PORT=8080 FLUXA_ROOT=/mnt/data FLUXA_DEVICE_NAME="Living Room PC" ./fluxa
```

---

## API Reference

Full API documentation is in [docs/api.md](docs/api.md).

### Quick Reference

```
GET    /health                    Health check
GET    /api/device/info           This device's info
GET    /api/devices               LAN-discovered devices

GET    /api/files?path=/          List directory
GET    /api/download?path=...     Download a file
POST   /api/upload                Upload file (multipart)
DELETE /api/files?path=...        Delete single file or folder
POST   /api/files/delete-batch    Batch delete multiple paths
POST   /api/rename                Rename / move
POST   /api/mkdir                 Create directory
POST   /api/copy                  Copy file or directory

POST   /api/connect/request       Request connection to device
POST   /api/connect/accept        Accept connection request
POST   /api/connect/reject        Reject connection request
GET    /api/sessions              List all sessions

POST   /api/transfer/init         Initialise chunked transfer
POST   /api/transfer/chunk        Send a single chunk
GET    /api/transfer/status/:id   Transfer status
GET    /api/transfer/:id/chunks   Received-chunks bitmap (resume)
GET    /api/transfer/list         List all transfers

WS     /ws                        WebSocket event stream
```

---

## Project Structure

```
Fluxa/
├── backend/                  # Rust backend
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs           # Entry point, router setup
│       ├── config.rs         # Configuration from env vars
│       ├── state.rs          # Shared application state + types
│       ├── error.rs          # Error types + HTTP responses
│       ├── api/
│       │   ├── mod.rs        # Route registration
│       │   ├── files.rs      # File CRUD operations
│       │   ├── devices.rs    # Device discovery API
│       │   ├── connection.rs # Connection request/accept/reject
│       │   └── transfer.rs   # Chunked file transfer
│       ├── discovery/
│       │   └── mod.rs        # mDNS broadcast + listener
│       └── websocket/
│           └── mod.rs        # WebSocket upgrade + event relay
│
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── App.tsx           # Root component
│   │   ├── types/            # TypeScript types
│   │   ├── store/            # Zustand state management
│   │   ├── api/              # API hooks (TanStack Query + Axios)
│   │   ├── hooks/            # useWebSocket, etc.
│   │   └── components/       # UI components
│   └── vite.config.ts
│
├── docs/                     # Documentation
│   ├── api.md                # Full API reference
│   └── user-guide.md         # Beginner-friendly guide
│
├── start.sh                  # Production launcher
├── dev.sh                    # Development launcher  
└── Makefile                  # Build shortcuts
```

---

## Security

- **Path traversal protection**: All file paths are canonicalized and checked against the configured root directory before any operation.
- **Consent-based connections**: Every connection request requires explicit Accept from the target device.
- **SHA-256 integrity checks**: Optional per-file and per-chunk checksums for transfer verification.
- **Upload size limit**: Configurable max upload size (default 4 GiB) to prevent resource exhaustion.
- **No cloud, no internet**: All communication is strictly on the local network.

---

## License

MIT © Fluxa Team
