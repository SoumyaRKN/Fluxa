# Fluxa – Full API Reference

## Base URL

When running locally: `http://localhost:7070`

All JSON responses use `Content-Type: application/json`.  
Errors are returned as `{ "error": "message" }` with an appropriate HTTP status code.

---

## General

### `GET /health`

Health check endpoint.

**Response:** `200 OK` with body `OK`

---

### `GET /api/device/info`

Returns metadata about the currently running Fluxa instance.

**Response:**

```json
{
  "id": "MyPC-7070",
  "name": "MyPC",
  "ip": "192.168.1.10",
  "port": 7070,
  "platform": "linux",
  "version": "1.0.2"
}
```

---

## Settings

### `GET /api/settings`

Returns the current runtime settings.

**Response:** `200 OK`

```json
{
  "device_name": "MyPC",
  "root_dir": "/home/user",
  "chunk_size": 2097152,
  "max_upload_size": 4294967296
}
```

| Field | Type | Description |
|---|---|---|
| `device_name` | string | Name shown to other LAN peers |
| `root_dir` | string | Absolute path of the directory being served |
| `chunk_size` | integer | Chunk size in bytes for peer transfers |
| `max_upload_size` | integer | Maximum single-file upload size in bytes |

---

### `PATCH /api/settings`

Update one or more settings at runtime. All fields are optional — only provided fields are changed. Changes take effect immediately without restarting the server.

**Request body:** `application/json` (all fields optional)

```json
{
  "device_name": "Office Laptop",
  "root_dir": "/home/user/shared",
  "chunk_size": 4194304,
  "max_upload_size": 10737418240
}
```

**Validation constraints:**

| Field | Constraint |
|---|---|
| `device_name` | Non-empty string |
| `root_dir` | Must exist and be a directory on the server filesystem |
| `chunk_size` | 65 536 – 67 108 864 bytes (64 KiB – 64 MiB) |
| `max_upload_size` | 1 048 576 – 107 374 182 400 bytes (1 MiB – 100 GiB) |

**Response:** `200 OK` — same shape as `GET /api/settings`, reflecting the updated values.

**Error responses:**

- `400 Bad Request` — validation failed (invalid value or non-existent path)

> **Note:** The bind address and port (`FLUXA_HOST`, `FLUXA_PORT`) are startup-only and cannot be changed via this API.

---

## File System

### `GET /api/files?path=/`

List the contents of a directory.

**Query params:**

- `path` (string, default `/`) – path relative to the configured root directory.

**Response:** `200 OK`

```json
[
  {
    "name": "Documents",
    "path": "/Documents",
    "kind": "directory",
    "size": 4096,
    "modified": "2026-03-01T12:00:00Z",
    "mime": null
  },
  {
    "name": "report.pdf",
    "path": "/Documents/report.pdf",
    "kind": "file",
    "size": 1048576,
    "modified": "2026-04-01T08:30:00Z",
    "mime": "application/pdf"
  }
]
```

Possible `kind` values: `"file"`, `"directory"`, `"symlink"`.

---

### `GET /api/download?path=...`

Stream a file to the client.

**Query params:**

- `path` (string, required) – file path relative to root.

**Response:** `200 OK` with `Content-Type` and `Content-Disposition: attachment` headers.

---

### `POST /api/upload`

Upload one or more files via multipart form.

**Form fields:**

- `file` (binary, required) – the file content.
- `path` (string, optional) – destination directory (relative to root; defaults to root).
- `checksum` (string, optional) – SHA-256 hex digest for integrity verification.

**Response:** `200 OK`

```json
{
  "success": true,
  "path": "/uploads/report.pdf",
  "size": 1048576
}
```

---

### `DELETE /api/files?path=...`

Delete a file or entire directory (recursive).

**Response:** `200 OK`

```json
{ "success": true }
```

---

### `POST /api/rename`

Rename or move a file/directory.

**Body:**

```json
{
  "from": "/old-name.txt",
  "to": "/new-name.txt"
}
```

**Response:** `200 OK` `{ "success": true }`

---

### `POST /api/copy`

Copy a file or directory.

**Body:**

```json
{
  "from": "/source.txt",
  "to": "/destination.txt"
}
```

**Response:** `200 OK` `{ "success": true }`

---

### `POST /api/mkdir`

Create a new directory (including intermediate directories).

**Body:**

```json
{ "path": "/Projects/new-folder" }
```

**Response:** `200 OK` `{ "success": true }`

---

### `POST /api/files/delete-batch`

Delete multiple files and/or directories in a single request.

**Body:**

```json
{
  "paths": ["/old-report.pdf", "/tmp/scratch-folder"]
}
```

**Response:** `200 OK`

```json
{
  "deleted": 2,
  "errors": []
}
```

On partial success, `deleted` is the count of successfully removed items and `errors` is an array of per-path error strings. The endpoint always returns `200` even on partial failure — inspect `errors` to detect issues.

---

## Device Discovery

### `GET /api/devices`

List all Fluxa devices discovered on the local network via mDNS.

**Response:** `200 OK`

```json
[
  {
    "id": "LivingRoomPC-7070",
    "name": "LivingRoomPC",
    "ip": "192.168.1.20",
    "port": 7070,
    "platform": "windows",
    "version": "1.0.2",
    "discovered_at": "2026-04-12T10:00:00Z"
  }
]
```

---

## Connection Management

### `POST /api/connect/request`

Send a connection request to a device. The remote device will receive a
`ConnectRequest` WebSocket event prompting the user to accept or reject.

**Body:**

```json
{
  "target_ip": "192.168.1.20",
  "target_port": 7070,
  "device_id": "MyPC-7070",
  "device_name": "MyPC"
}
```

**Response:** `200 OK`

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "Pending"
}
```

---

### `POST /api/connect/accept`

Accept a pending connection request.

**Body:**

```json
{ "session_id": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response:** `200 OK` `{ "session_id": "...", "state": "Active" }`

---

### `POST /api/connect/reject`

Reject a pending connection request.

**Body:**

```json
{ "session_id": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response:** `200 OK` `{ "session_id": "...", "state": "Rejected" }`

---

### `GET /api/sessions`

List all sessions (Pending, Active, Rejected).

**Response:** `200 OK` — array of session objects:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "device_id": "LivingRoomPC-7070",
    "device_name": "LivingRoomPC",
    "device_ip": "192.168.1.20",
    "state": "Active",
    "created_at": "2026-04-12T12:00:00Z"
  }
]
```

Pending sessions expire automatically after **60 seconds** if not acted on.

---

## File Transfer (Chunked)

### `POST /api/transfer/init`

Initialize a new incoming file transfer.

**Body:**

```json
{
  "session_id": "550e8400-...",
  "file_name": "video.mp4",
  "file_size": 1073741824,
  "checksum": "abc123...",
  "dest_path": "/Downloads"
}
```

**Response:** `200 OK`

```json
{
  "transfer_id": "...",
  "total_chunks": 512,
  "chunk_size": 2097152
}
```

---

### `POST /api/transfer/chunk`

Send a single chunk of file data.

**Body:**

```json
{
  "transfer_id": "...",
  "chunk_index": 0,
  "data": "<base64-encoded chunk>",
  "chunk_checksum": "<sha256-of-chunk>"
}
```

**Response:** `200 OK`

```json
{
  "received": true,
  "chunk_index": 0,
  "percent": 0.19,
  "complete": false
}
```

---

### `GET /api/transfer/status/:id`

Get status of a running or completed transfer.

**Response:** `200 OK`

```json
{
  "id": "...",
  "file_name": "video.mp4",
  "file_size": 1073741824,
  "bytes_transferred": 10485760,
  "percent": 9.77,
  "state": "Active",
  "direction": "Incoming",
  "total_chunks": 512
}
```

---

### `GET /api/transfer/list`

List all transfers.

**Response:** array of transfer summary objects.

---

### `GET /api/transfer/:id/chunks`

Return the received-chunks bitmap for a transfer. Use this after an interruption to resume: the sender reads the bitmap and skips already-acknowledged chunk indexes.

**Response:** `200 OK`

```json
{
  "transfer_id": "...",
  "total_chunks": 512,
  "received_chunks": [true, true, true, false, false, ...]
}
```

`received_chunks` is an array of booleans, one per chunk, `true` means the chunk was received and validated. Indices where the value is `false` must be retransmitted.

---

## WebSocket

### `WS /ws`

Upgrade to a WebSocket connection for real-time events.

All messages are JSON in the format:

```json
{ "type": "EventName", "payload": { ... } }
```

### Event Types

| Type | Direction | Description |
|---|---|---|
| `ConnectRequest` | Server → Client | Incoming connection request from another device |
| `ConnectAccept` | Server → Client | Remote accepted your connection request |
| `ConnectReject` | Server → Client | Remote rejected your connection request |
| `TransferStart` | Server → Client | A new file transfer has started |
| `TransferProgress` | Server → Client | Transfer progress update |
| `TransferComplete` | Server → Client | Transfer finished successfully |
| `TransferFailed` | Server → Client | Transfer failed with reason |
| `DeviceDiscovered` | Server → Client | New Fluxa device found on LAN |
| `DeviceLost` | Server → Client | Device left the network |

### Example: ConnectRequest

```json
{
  "type": "ConnectRequest",
  "payload": {
    "session_id": "550e8400-...",
    "from_device_id": "LivingRoomPC-7070",
    "from_device_name": "LivingRoomPC",
    "from_ip": "192.168.1.20"
  }
}
```

### Example: TransferProgress

```json
{
  "type": "TransferProgress",
  "payload": {
    "transfer_id": "...",
    "bytes_transferred": 26214400,
    "total_bytes": 1073741824,
    "percent": 24.41,
    "chunks_completed": 12
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{ "error": "descriptive error message" }
```

| HTTP Status | Meaning |
|---|---|
| `400 Bad Request` | Invalid parameters or malformed request |
| `403 Forbidden` | Path traversal attempt or permission denied |
| `404 Not Found` | File, session or transfer not found |
| `409 Conflict` | Destination already exists |
| `413 Payload Too Large` | Upload exceeds configured limit (default 4 GiB) |
| `500 Internal Server Error` | Unexpected server error |
