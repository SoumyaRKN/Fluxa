use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use tracing::{debug, info, warn};
use uuid::Uuid;

use crate::state::AppState;

/// Upgrade handler – GET /ws
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let client_id = Uuid::new_v4().to_string();
    info!("WebSocket client connected: {client_id}");

    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast channel BEFORE spawning tasks
    let mut rx = state.ws_tx.subscribe();

    // Clone for the send task (client_id is moved in)
    let send_client_id = client_id.clone();

    // Task: forward broadcast events to this client
    let send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(event) => {
                    let payload = match serde_json::to_string(&event) {
                        Ok(s) => s,
                        Err(e) => {
                            warn!("Failed to serialize WS event: {e}");
                            continue;
                        }
                    };
                    if sender.send(Message::Text(payload.into())).await.is_err() {
                        break;
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                    warn!("WS client {send_client_id} lagged by {n} messages");
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
        debug!("WS send task ended for {send_client_id}");
    });

    // Task: receive messages from this client
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    debug!("WS message from client: {text}");
                    // Future: handle incoming commands here
                }
                Ok(Message::Ping(_)) => {} // axum handles pong automatically
                Ok(Message::Close(_)) => break,
                Err(e) => {
                    warn!("WS receive error: {e}");
                    break;
                }
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    info!("WebSocket client disconnected: {client_id}");
}
