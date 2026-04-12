use crate::config::Config;
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

// ── WebSocket broadcast channel ────────────────────────────────────────────────

/// Events pushed over the WebSocket broadcast channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    ConnectRequest(ConnectRequest),
    ConnectAccept { session_id: String, from: String },
    ConnectReject { session_id: String, from: String },
    TransferStart(TransferInfo),
    TransferProgress(TransferProgress),
    TransferComplete { transfer_id: String },
    TransferFailed { transfer_id: String, reason: String },
    DeviceDiscovered(DeviceInfo),
    DeviceLost { device_id: String },
    Ping,
}

// ── Device ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub port: u16,
    pub platform: String,
    pub version: String,
    pub discovered_at: DateTime<Utc>,
}

// ── Connection / Session ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionState {
    Pending,
    Active,
    Rejected,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub device_id: String,
    pub device_name: String,
    pub device_ip: String,
    /// Port of the peer device — used to call back for accept/reject.
    pub device_port: u16,
    pub state: SessionState,
    pub created_at: DateTime<Utc>,
}

impl Session {
    pub fn new_pending(
        device_id: &str,
        device_name: &str,
        device_ip: &str,
        device_port: u16,
    ) -> Self {
        Session {
            id: Uuid::new_v4().to_string(),
            device_id: device_id.to_string(),
            device_name: device_name.to_string(),
            device_ip: device_ip.to_string(),
            device_port,
            state: SessionState::Pending,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectRequest {
    pub session_id: String,
    pub from_device_id: String,
    pub from_device_name: String,
    pub from_ip: String,
}

// ── Transfer ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TransferState {
    Pending,
    Active,
    Paused,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferInfo {
    pub id: String,
    pub session_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub total_chunks: u64,
    pub chunk_size: u64,
    pub direction: TransferDirection,
    pub started_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TransferDirection {
    Incoming,
    Outgoing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transfer {
    pub info: TransferInfo,
    pub state: TransferState,
    pub received_chunks: Vec<bool>,
    pub bytes_transferred: u64,
    pub checksum: Option<String>,
    pub dest_path: Option<String>,
}

impl Transfer {
    pub fn progress_percent(&self) -> f32 {
        if self.info.total_chunks == 0 {
            return 100.0;
        }
        let done = self.received_chunks.iter().filter(|&&b| b).count() as f32;
        (done / self.info.total_chunks as f32) * 100.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub percent: f32,
    pub chunks_completed: u64,
}

// ── App State ──────────────────────────────────────────────────────────────────

/// Mutable runtime settings — readable and writable via the settings API.
/// These can be changed without restarting the server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeSettings {
    /// Human-readable device name shown to peers.
    pub device_name: String,
    /// Root directory to browse and serve files from.
    pub root_dir: PathBuf,
    /// Chunk size (bytes) used when initiating outgoing transfers.
    pub chunk_size: usize,
    /// Maximum single-file upload size (bytes).
    pub max_upload_size: u64,
}

#[derive(Clone)]
pub struct AppState {
    /// Immutable startup config (bind address, port, etc.).
    pub config: Arc<Config>,
    /// Mutable runtime settings — changeable via the settings API.
    pub settings: Arc<RwLock<RuntimeSettings>>,
    /// Discovered LAN devices
    pub devices: Arc<RwLock<Vec<DeviceInfo>>>,
    /// Active + pending sessions keyed by session ID
    pub sessions: Arc<DashMap<String, Session>>,
    /// Active transfers keyed by transfer ID
    pub transfers: Arc<DashMap<String, Transfer>>,
    /// Broadcast channel for WebSocket events (capacity 256)
    pub ws_tx: broadcast::Sender<WsEvent>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        let (ws_tx, _) = broadcast::channel(256);
        let settings = RuntimeSettings {
            device_name: config.device_name.clone(),
            root_dir: config.root_dir.clone(),
            chunk_size: config.chunk_size,
            max_upload_size: config.max_upload_size,
        };
        AppState {
            config: Arc::new(config),
            settings: Arc::new(RwLock::new(settings)),
            devices: Arc::new(RwLock::new(Vec::new())),
            sessions: Arc::new(DashMap::new()),
            transfers: Arc::new(DashMap::new()),
            ws_tx,
        }
    }

    /// Publish an event to all connected WebSocket clients.
    pub fn broadcast(&self, event: WsEvent) {
        // If no receivers, that's fine – just ignore the error.
        let _ = self.ws_tx.send(event);
    }
}
