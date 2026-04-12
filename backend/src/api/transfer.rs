use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tokio::{fs, io::AsyncWriteExt};
use uuid::Uuid;

use crate::{
    api::files::safe_join,
    error::{AppError, AppResult},
    state::{
        AppState, Transfer, TransferDirection, TransferInfo, TransferProgress,
        TransferState, WsEvent,
    },
};

// ── DTOs ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct InitTransferRequest {
    pub session_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub checksum: Option<String>,
    pub dest_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChunkRequest {
    pub transfer_id: String,
    pub chunk_index: u64,
    pub data: String, // base64-encoded chunk data
    pub chunk_checksum: Option<String>,
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/// POST /api/transfer/init  –  initialise a new incoming transfer
pub async fn init_transfer(
    State(state): State<AppState>,
    Json(body): Json<InitTransferRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Validate session
    {
        let session = state
            .sessions
            .get(&body.session_id)
            .ok_or_else(|| AppError::SessionNotFound(body.session_id.clone()))?;
        if session.state != crate::state::SessionState::Active {
            return Err(AppError::BadRequest("Session is not active".into()));
        }
    }

    let chunk_size = state.settings.read().await.chunk_size as u64;
    let total_chunks = body.file_size.div_ceil(chunk_size);

    let transfer_id = Uuid::new_v4().to_string();
    let info = TransferInfo {
        id: transfer_id.clone(),
        session_id: body.session_id.clone(),
        file_name: body.file_name.clone(),
        file_size: body.file_size,
        total_chunks,
        chunk_size,
        direction: TransferDirection::Incoming,
        started_at: Utc::now(),
    };

    let transfer = Transfer {
        info: info.clone(),
        state: TransferState::Active,
        received_chunks: vec![false; total_chunks as usize],
        bytes_transferred: 0,
        checksum: body.checksum,
        dest_path: body.dest_path,
    };

    state.transfers.insert(transfer_id.clone(), transfer);
    state.broadcast(WsEvent::TransferStart(info));

    Ok(serde_json::json!({
        "transfer_id": transfer_id,
        "total_chunks": total_chunks,
        "chunk_size": chunk_size,
    })
    .into())
}

/// POST /api/transfer/chunk  –  receive a single chunk
pub async fn receive_chunk(
    State(state): State<AppState>,
    Json(body): Json<ChunkRequest>,
) -> AppResult<Json<serde_json::Value>> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let raw = STANDARD
        .decode(&body.data)
        .map_err(|e| AppError::BadRequest(format!("Invalid base64 chunk data: {e}")))?;

    // Validate per-chunk checksum if provided
    if let Some(expected_cs) = &body.chunk_checksum {
        let mut h = Sha256::new();
        h.update(&raw);
        let actual = hex::encode(h.finalize());
        if actual != *expected_cs {
            return Err(AppError::BadRequest(format!(
                "Chunk {} checksum mismatch",
                body.chunk_index
            )));
        }
    }

    // Write chunk bytes to disk before updating in-memory state.
    // Chunks are stored at: <root>/._fluxa_temp/<transfer_id>/<index:08>
    {
        let root_dir = state.settings.read().await.root_dir.clone();
        let temp_dir = root_dir
            .join("._fluxa_temp")
            .join(&body.transfer_id);
        fs::create_dir_all(&temp_dir).await.map_err(AppError::Io)?;
        let chunk_path = temp_dir.join(format!("{:08}", body.chunk_index));
        fs::write(&chunk_path, &raw).await.map_err(AppError::Io)?;
    }

    let (file_name, file_size, total_chunks, bytes_done, percent, dest_path, complete) = {
        let mut transfer = state
            .transfers
            .get_mut(&body.transfer_id)
            .ok_or_else(|| AppError::TransferNotFound(body.transfer_id.clone()))?;

        let idx = body.chunk_index as usize;
        if idx >= transfer.received_chunks.len() {
            return Err(AppError::BadRequest(format!(
                "Invalid chunk index {idx}"
            )));
        }

        transfer.received_chunks[idx] = true;
        transfer.bytes_transferred += raw.len() as u64;
        let bytes_done = transfer.bytes_transferred;
        let percent = transfer.progress_percent();
        let file_name = transfer.info.file_name.clone();
        let file_size = transfer.info.file_size;
        let total_chunks = transfer.info.total_chunks;
        let dest_path = transfer.dest_path.clone();
        let complete = transfer.received_chunks.iter().all(|&b| b);
        (file_name, file_size, total_chunks, bytes_done, percent, dest_path, complete)
    };

    // Broadcast progress
    state.broadcast(WsEvent::TransferProgress(TransferProgress {
        transfer_id: body.transfer_id.clone(),
        bytes_transferred: bytes_done,
        total_bytes: file_size,
        percent,
        chunks_completed: body.chunk_index + 1,
    }));

    // If all chunks received, reassemble the file
    if complete {
        match reassemble_file(&state, &body.transfer_id, &file_name, total_chunks, dest_path).await {
            Ok(()) => {
                state.broadcast(WsEvent::TransferComplete {
                    transfer_id: body.transfer_id.clone(),
                });
                if let Some(mut t) = state.transfers.get_mut(&body.transfer_id) {
                    t.state = TransferState::Completed;
                }
            }
            Err(e) => {
                let reason = e.to_string();
                state.broadcast(WsEvent::TransferFailed {
                    transfer_id: body.transfer_id.clone(),
                    reason: reason.clone(),
                });
                if let Some(mut t) = state.transfers.get_mut(&body.transfer_id) {
                    t.state = TransferState::Failed;
                }
                return Err(AppError::Internal(reason));
            }
        }
    }

    Ok(serde_json::json!({
        "received": true,
        "chunk_index": body.chunk_index,
        "percent": percent,
        "complete": complete,
    })
    .into())
}

/// GET /api/transfer/status/:id
pub async fn transfer_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    let t = state
        .transfers
        .get(&id)
        .ok_or_else(|| AppError::TransferNotFound(id.clone()))?;

    Ok(serde_json::json!({
        "id": t.info.id,
        "file_name": t.info.file_name,
        "file_size": t.info.file_size,
        "bytes_transferred": t.bytes_transferred,
        "percent": t.progress_percent(),
        "state": format!("{:?}", t.state),
        "direction": format!("{:?}", t.info.direction),
        "total_chunks": t.info.total_chunks,
    })
    .into())
}

/// GET /api/transfer/list
pub async fn list_transfers(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<serde_json::Value>>> {
    let list = state
        .transfers
        .iter()
        .map(|e| {
            let t = e.value();
            serde_json::json!({
                "id": t.info.id,
                "file_name": t.info.file_name,
                "file_size": t.info.file_size,
                "bytes_transferred": t.bytes_transferred,
                "percent": t.progress_percent(),
                "state": format!("{:?}", t.state),
                "direction": format!("{:?}", t.info.direction),
            })
        })
        .collect();
    Ok(Json(list))
}

/// GET /api/transfer/:id/chunks  –  return the received-chunks bitmap for resume support.
/// The sender can query this before (or after interruption) to skip already-received chunks.
pub async fn transfer_chunks(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    let t = state
        .transfers
        .get(&id)
        .ok_or_else(|| AppError::TransferNotFound(id.clone()))?;

    Ok(Json(serde_json::json!({
        "transfer_id": id,
        "total_chunks": t.info.total_chunks,
        "received_chunks": t.received_chunks,
    })))
}

// ── Reassemble ─────────────────────────────────────────────────────────────────

/// Write the completed transfer chunks from temp storage to final destination.
async fn reassemble_file(
    state: &AppState,
    transfer_id: &str,
    file_name: &str,
    total_chunks: u64,
    dest_path: Option<String>,
) -> AppResult<()> {
    let dest_dir = if let Some(p) = dest_path {
        safe_join(&state.settings.read().await.root_dir.clone(), &p)?
    } else {
        state.settings.read().await.root_dir.join("Downloads")
    };

    fs::create_dir_all(&dest_dir).await.map_err(AppError::Io)?;
    let final_path = dest_dir.join(sanitize_filename(file_name));

    // Chunks are stored in a temp directory: <root>/._fluxa_temp/<transfer_id>/
    let temp_dir = state
        .settings
        .read()
        .await
        .root_dir
        .join("._fluxa_temp")
        .join(transfer_id);

    let mut out = fs::File::create(&final_path).await.map_err(AppError::Io)?;
    for idx in 0..total_chunks {
        let chunk_path = temp_dir.join(format!("{idx:08}"));
        let data = fs::read(&chunk_path).await.map_err(AppError::Io)?;
        out.write_all(&data).await.map_err(AppError::Io)?;
    }
    out.flush().await.map_err(AppError::Io)?;

    // Clean up temp directory
    let _ = fs::remove_dir_all(&temp_dir).await;

    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .filter(|&c| c != '/' && c != '\\' && c != '\0')
        .take(255)
        .collect::<String>()
        .trim()
        .to_string()
}
