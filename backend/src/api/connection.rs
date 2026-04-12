use axum::{extract::State, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

use crate::{
    error::{AppError, AppResult},
    state::{AppState, ConnectRequest, Session, SessionState, WsEvent},
};

// ── DTOs ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RequestConnectionBody {
    pub target_ip: String,
    pub target_port: u16,
    pub device_id: String,
    pub device_name: String,
}

#[derive(Debug, Deserialize)]
pub struct SessionActionBody {
    pub session_id: String,
}

/// Payload forwarded device-to-device: requester → target
#[derive(Debug, Serialize, Deserialize)]
pub struct NotifyConnectionBody {
    pub session_id: String,
    pub from_device_id: String,
    pub from_device_name: String,
    /// Requester's LAN IP (so the target knows where to call back)
    pub from_ip: String,
    pub from_port: u16,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

fn http_client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to build HTTP client: {e}")))
}

fn own_ip() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/// POST /api/connect/request  –  initiate a connection to a remote device.
///
/// Creates a local pending session, then forwards the request to the target
/// device's `/api/connect/notify` endpoint so that *its* UI shows the modal.
/// The requester's own UI does NOT receive a ConnectRequest WsEvent.
pub async fn request_connection(
    State(state): State<AppState>,
    Json(body): Json<RequestConnectionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let session = Session::new_pending(
        &body.device_id,
        &body.device_name,
        &body.target_ip,
        body.target_port,
    );
    let sid = session.id.clone();
    state.sessions.insert(sid.clone(), session);

    // Forward the connection request to the target device.
    let notify_url = format!(
        "http://{}:{}/api/connect/notify",
        body.target_ip, body.target_port
    );
    let notify_body = NotifyConnectionBody {
        session_id: sid.clone(),
        from_device_id: body.device_id.clone(),
        from_device_name: body.device_name.clone(),
        from_ip: own_ip(),
        from_port: state.config.port,
    };

    let client = http_client()?;
    if let Err(e) = client.post(&notify_url).json(&notify_body).send().await {
        state.sessions.remove(&sid);
        return Err(AppError::BadRequest(format!(
            "Could not reach target device at {notify_url}: {e}"
        )));
    }

    Ok(Json(json!({ "session_id": sid, "state": "Pending" })))
}

/// POST /api/connect/notify  –  called by a remote peer to deliver a connection
/// request to this device.  Creates a local pending session and shows the
/// ConnectionModal on this device's UI.
pub async fn notify_connection(
    State(state): State<AppState>,
    Json(body): Json<NotifyConnectionBody>,
) -> AppResult<Json<serde_json::Value>> {
    // Create a mirrored session so we know where to call back when the user
    // accepts or rejects.
    let session = Session {
        id:          body.session_id.clone(),
        device_id:   body.from_device_id.clone(),
        device_name: body.from_device_name.clone(),
        device_ip:   body.from_ip.clone(),
        device_port: body.from_port,
        state:       SessionState::Pending,
        created_at:  Utc::now(),
    };
    state.sessions.insert(body.session_id.clone(), session);

    // Notify local WebSocket clients → ConnectionModal appears on this device.
    state.broadcast(WsEvent::ConnectRequest(ConnectRequest {
        session_id:      body.session_id.clone(),
        from_device_id:  body.from_device_id.clone(),
        from_device_name: body.from_device_name.clone(),
        from_ip:         body.from_ip.clone(),
    }));

    Ok(Json(json!({ "session_id": body.session_id, "state": "Pending" })))
}

/// POST /api/connect/accept  –  accept an incoming connection request.
/// Marks the local session Active, then calls back to the requester's
/// `/api/connect/peer-accept` so its session is also marked Active.
pub async fn accept_connection(
    State(state): State<AppState>,
    Json(body): Json<SessionActionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let (device_ip, device_port, device_name) = {
        let mut session = state
            .sessions
            .get_mut(&body.session_id)
            .ok_or_else(|| AppError::SessionNotFound(body.session_id.clone()))?;

        if session.state != SessionState::Pending {
            return Err(AppError::BadRequest(format!(
                "Session {} is not pending",
                body.session_id
            )));
        }
        session.state = SessionState::Active;
        (
            session.device_ip.clone(),
            session.device_port,
            session.device_name.clone(),
        )
    };

    // Best-effort callback to the requester — if it went offline we still
    // continue so the accepting device is unblocked.
    let peer_url = format!("http://{}:{}/api/connect/peer-accept", device_ip, device_port);
    if let Ok(client) = http_client() {
        let _ = client
            .post(&peer_url)
            .json(&json!({ "session_id": body.session_id }))
            .send()
            .await;
    }

    state.broadcast(WsEvent::ConnectAccept {
        session_id: body.session_id.clone(),
        from: device_name,
    });

    Ok(Json(json!({ "session_id": body.session_id, "state": "Active" })))
}

/// POST /api/connect/peer-accept  –  called by the target device after it
/// accepts.  Marks the requester's local session Active and notifies its UI.
pub async fn peer_accept_connection(
    State(state): State<AppState>,
    Json(body): Json<SessionActionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let device_name = if let Some(mut session) = state.sessions.get_mut(&body.session_id) {
        session.state = SessionState::Active;
        session.device_name.clone()
    } else {
        // Session missing (e.g. requester restarted); just acknowledge.
        tracing::warn!("peer-accept for unknown session {}", body.session_id);
        return Ok(Json(json!({ "session_id": body.session_id, "state": "Active" })));
    };

    state.broadcast(WsEvent::ConnectAccept {
        session_id: body.session_id.clone(),
        from: device_name,
    });

    Ok(Json(json!({ "session_id": body.session_id, "state": "Active" })))
}

/// POST /api/connect/reject  –  reject an incoming connection request.
pub async fn reject_connection(
    State(state): State<AppState>,
    Json(body): Json<SessionActionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let (device_ip, device_port, device_name) = {
        let mut session = state
            .sessions
            .get_mut(&body.session_id)
            .ok_or_else(|| AppError::SessionNotFound(body.session_id.clone()))?;

        let name = session.device_name.clone();
        session.state = SessionState::Rejected;
        (session.device_ip.clone(), session.device_port, name)
    };

    let peer_url = format!("http://{}:{}/api/connect/peer-reject", device_ip, device_port);
    if let Ok(client) = http_client() {
        let _ = client
            .post(&peer_url)
            .json(&json!({ "session_id": body.session_id }))
            .send()
            .await;
    }

    state.broadcast(WsEvent::ConnectReject {
        session_id: body.session_id.clone(),
        from: device_name,
    });

    Ok(Json(json!({ "session_id": body.session_id, "state": "Rejected" })))
}

/// POST /api/connect/peer-reject  –  called by the target device after it
/// rejects.  Marks the requester's local session Rejected and notifies its UI.
pub async fn peer_reject_connection(
    State(state): State<AppState>,
    Json(body): Json<SessionActionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let device_name = if let Some(mut session) = state.sessions.get_mut(&body.session_id) {
        session.state = SessionState::Rejected;
        session.device_name.clone()
    } else {
        tracing::warn!("peer-reject for unknown session {}", body.session_id);
        return Ok(Json(json!({ "session_id": body.session_id, "state": "Rejected" })));
    };

    state.broadcast(WsEvent::ConnectReject {
        session_id: body.session_id.clone(),
        from: device_name,
    });

    Ok(Json(json!({ "session_id": body.session_id, "state": "Rejected" })))
}

/// GET /api/sessions  –  list all sessions
pub async fn list_sessions(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<Session>>> {
    let sessions: Vec<Session> = state
        .sessions
        .iter()
        .map(|e| e.value().clone())
        .collect();
    Ok(Json(sessions))
}
