use axum::{extract::State, Json};
use serde_json::json;

use crate::{error::AppResult, state::{AppState, DeviceInfo}};

/// GET /api/devices  –  list discovered LAN devices
pub async fn list_devices(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<DeviceInfo>>> {
    let devices = state.devices.read().await;
    Ok(Json(devices.clone()))
}

/// GET /api/device/info  –  return this device's info
pub async fn self_info(
    State(state): State<AppState>,
) -> AppResult<Json<serde_json::Value>> {
    let ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let s = state.settings.read().await;
    Ok(Json(json!({
        "id": format!("{}-{}", s.device_name, state.config.port),
        "name": s.device_name,
        "ip": ip,
        "port": state.config.port,
        "platform": std::env::consts::OS,
        "version": env!("CARGO_PKG_VERSION"),
    })))
}
