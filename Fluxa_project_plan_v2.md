# Fluxa – Production-Grade Project Plan (V2)

## Product Name

Fluxa

## Vision

A high-performance, cross-platform, zero-install smart file explorer and LAN-based transfer system with device discovery and consent-based communication.

---

## 1. System Architecture

### Backend (Rust)

- Runtime: Tokio
- Framework: Axum
- WebSocket: tokio-tungstenite
- Discovery: mdns
- Serialization: serde

### Frontend

- Framework: React
- Styling: TailwindCSS

### Desktop Wrapper

- Tauri

---

## 2. Detailed Feature Set

### File Explorer

- Directory traversal
- CRUD operations
- Multi-select & batch operations

### Transfer Engine

- Chunked uploads
- Resume support
- Parallel streams
- Integrity checks (hashing)

### Discovery System

- mDNS service broadcast
- Listener service
- Device metadata exchange

### Connection Protocol

- Request → Accept → Session
- Session IDs
- Timeout handling

---

## 3. API Specification

### File List

GET /api/files?path=/
Response:
{
  "files": [
    {"name": "file.txt", "type": "file", "size": 1234}
  ]
}

### Upload

POST /api/upload
Multipart file

### Download

GET /api/download?path=...

---

## 4. WebSocket Events

CONNECT_REQUEST
CONNECT_ACCEPT
CONNECT_REJECT
TRANSFER_PROGRESS
TRANSFER_COMPLETE

---

## 5. Transfer Protocol

- Split file into chunks (1MB default)
- Send chunks with index
- Receiver reassembles
- Retry failed chunks
- Resume via chunk map

---

## 6. Discovery Protocol

Service: _Fluxaflow._tcp.local
Fields:

- device_name
- ip
- port
- capabilities

---

## 7. Security

- Consent-based connection
- Session validation
- Optional PIN pairing

---

## 8. UI/UX Design

### Panels

- File Explorer
- Nearby Devices
- Transfer Progress

### Actions

- Drag & drop
- Right-click menu
- Accept/reject popup

---

## 9. Project Structure

backend/
  discovery/
  connection/
  transfer/
  api/
  websocket/

frontend/
  components/
  pages/

---

## 10. Build & Packaging

### Backend

cargo build --release

### Frontend

npm build

### Tauri

tauri build

---

## 11. Development Phases

Phase 1: Core server + file APIs
Phase 2: UI
Phase 3: Discovery
Phase 4: Transfer optimization
Phase 5: Security & polish

---

## 12. Error Handling

- Network failures → retry
- Permission errors → user prompt
- File conflicts → overwrite/rename

---

## 13. Future Enhancements

- Mobile companion app
- Internet relay mode
- End-to-end encryption

---

## Conclusion

Fluxa Flow is designed as a modern alternative to FTP and AirDrop-like systems with extensibility and performance at its core.
