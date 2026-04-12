# Fluxa – V3 Executable Specification + Starter Code

## Overview

This document provides an executable-level specification and starter implementation for Fluxa.

---

# 1. Backend Starter (Rust)

## Cargo.toml

```toml
[package]
name = "fluxa"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower = "0.4"
uuid = { version = "1", features = ["v4"] }
tokio-tungstenite = "0.21"
futures = "0.3"
```

---

## main.rs

```rust
use axum::{
    routing::{get, post},
    Router,
    response::Json,
};
use serde::{Serialize};
use std::net::SocketAddr;

#[derive(Serialize)]
struct FileItem {
    name: String,
    size: u64,
}

async fn list_files() -> Json<Vec<FileItem>> {
    Json(vec![
        FileItem { name: "example.txt".into(), size: 1234 }
    ])
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/files", get(list_files));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Server running on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

---

# 2. WebSocket Spec

## Endpoint

/ws

## Message Format

```json
{
  "type": "CONNECT_REQUEST",
  "payload": {}
}
```

## Types

- CONNECT_REQUEST
- CONNECT_ACCEPT
- CONNECT_REJECT
- TRANSFER_START
- TRANSFER_PROGRESS
- TRANSFER_COMPLETE

---

# 3. Transfer Protocol

## Chunk Format

```json
{
  "file_id": "uuid",
  "chunk_index": 1,
  "total_chunks": 100,
  "data": "binary"
}
```

---

# 4. Frontend Starter (React)

## App.jsx

```javascript
import { useEffect, useState } from "react";

function App() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch("/files")
      .then(res => res.json())
      .then(setFiles);
  }, []);

  return (
    <div>
      <h1>Fluxa</h1>
      <ul>
        {files.map(f => (
          <li key={f.name}>{f.name} - {f.size}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

---

# 5. State Machine

## Connection Lifecycle

IDLE → REQUEST_SENT → WAITING → ACCEPTED → TRANSFERRING → COMPLETED

---

# 6. File Transfer Flow

1. Select file
2. Send request
3. Accept
4. Start chunk transfer
5. Reassemble

---

# 7. Build Instructions

## Backend

cargo run

## Frontend

npm install
npm run dev

---

# 8. Next Steps

- Implement file system traversal
- Add upload endpoint
- Add WebSocket handler
- Implement chunk transfer logic
- Add mDNS discovery

---

## Conclusion

This V3 provides a working base to start building Fluxa immediately.
