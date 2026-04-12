use axum::{extract::State, Json};
use serde::Deserialize;
use serde_json::json;

use crate::{
    error::{AppError, AppResult},
    state::{AppState, ConnectRequest, Session, SessionState, WsEvent},
};

// ── DTOs ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RequestConnectionBody {
    pub target_ip: String,
    #[allow(dead_code)] // stored by caller; reserved for future direct-dial
    pub target_port: u16,
    pub device_id: String,
    pub device_name: String,
}

#[derive(Debug, Deserialize)]
pub struct SessionActionBody {
    pub session_id: String,
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/// POST /api/connect/request  –  initiate connection to a remote device
/// This creates a pending session and notifies local WS clients.
pub async fn request_connection(
    State(state): State<AppState>,
    Json(body): Json<RequestConnectionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let session = Session::new_pending(
        &body.device_id,
        &body.device_name,
        &body.target_ip,
    );
    let sid = session.id.clone();

    state.sessions.insert(sid.clone(), session.clone());

    // Broadcast CONNECT_REQUEST event so other WS listeners (same device) know
    state.broadcast(WsEvent::ConnectRequest(ConnectRequest {
        session_id: sid.clone(),
        from_device_id: body.device_id.clone(),
        from_device_name: body.device_name.clone(),
        from_ip: body.target_ip.clone(),
    }));

    Ok(Json(json!({
        "session_id": sid,
        "state": "Pending",
    })))
}

/// POST /api/connect/accept  –  accept an incoming connection request
pub async fn accept_connection(
    State(state): State<AppState>,
    Json(body): Json<SessionActionBody>,
) -> AppResult<Json<serde_json::Value>> {
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
    let device_name = session.device_name.clone();
    drop(session);

    state.broadcast(WsEvent::ConnectAccept {
        session_id: body.session_id.clone(),
        from: device_name,
    });

    Ok(Json(json!({ "session_id": body.session_id, "state": "Active" })))
}

/// POST /api/connect/reject  –  reject an incoming connection request
pub async fn reject_connection(
    State(state): State<AppState>,
    Json(body): Json<SessionActionBody>,
) -> AppResult<Json<serde_json::Value>> {
    let mut session = state
        .sessions
        .get_mut(&body.session_id)
        .ok_or_else(|| AppError::SessionNotFound(body.session_id.clone()))?;

    let device_name = session.device_name.clone();
    session.state = SessionState::Rejected;
    drop(session);

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
