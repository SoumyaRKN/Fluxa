use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::{
    error::{AppError, AppResult},
    state::{AppState, RuntimeSettings},
};

// ── Response ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SettingsResponse {
    pub device_name: String,
    /// Root directory as a UTF-8 string
    pub root_dir: String,
    /// Chunk size in bytes
    pub chunk_size: usize,
    /// Max upload size in bytes
    pub max_upload_size: u64,
}

impl From<&RuntimeSettings> for SettingsResponse {
    fn from(s: &RuntimeSettings) -> Self {
        SettingsResponse {
            device_name: s.device_name.clone(),
            root_dir: s.root_dir.to_string_lossy().into_owned(),
            chunk_size: s.chunk_size,
            max_upload_size: s.max_upload_size,
        }
    }
}

// ── PATCH body ─────────────────────────────────────────────────────────────────

/// All fields are optional — only provided fields are updated.
#[derive(Debug, Deserialize)]
pub struct SettingsPatch {
    pub device_name: Option<String>,
    pub root_dir: Option<String>,
    /// Chunk size in bytes (min 64 KiB, max 64 MiB)
    pub chunk_size: Option<usize>,
    /// Max upload size in bytes (min 1 MiB, max 100 GiB)
    pub max_upload_size: Option<u64>,
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/// GET /api/settings — return the current runtime settings
pub async fn get_settings(
    State(state): State<AppState>,
) -> AppResult<Json<SettingsResponse>> {
    let s = state.settings.read().await;
    Ok(Json(SettingsResponse::from(&*s)))
}

/// PATCH /api/settings — update one or more settings at runtime
pub async fn patch_settings(
    State(state): State<AppState>,
    Json(patch): Json<SettingsPatch>,
) -> AppResult<Json<SettingsResponse>> {
    let mut s = state.settings.write().await;

    if let Some(name) = patch.device_name {
        let trimmed = name.trim().to_string();
        if trimmed.is_empty() {
            return Err(AppError::BadRequest("device_name must not be empty".into()));
        }
        s.device_name = trimmed;
    }

    if let Some(dir) = patch.root_dir {
        let path = PathBuf::from(&dir);
        if !path.exists() {
            return Err(AppError::BadRequest(format!(
                "root_dir '{dir}' does not exist"
            )));
        }
        if !path.is_dir() {
            return Err(AppError::BadRequest(format!(
                "root_dir '{dir}' is not a directory"
            )));
        }
        s.root_dir = path;
    }

    if let Some(cs) = patch.chunk_size {
        const MIN: usize = 64 * 1024;       // 64 KiB
        const MAX: usize = 64 * 1024 * 1024; // 64 MiB
        if !(MIN..=MAX).contains(&cs) {
            return Err(AppError::BadRequest(format!(
                "chunk_size must be between {MIN} and {MAX} bytes"
            )));
        }
        s.chunk_size = cs;
    }

    if let Some(mu) = patch.max_upload_size {
        const MIN: u64 = 1024 * 1024;              // 1 MiB
        const MAX: u64 = 100 * 1024 * 1024 * 1024; // 100 GiB
        if !(MIN..=MAX).contains(&mu) {
            return Err(AppError::BadRequest(format!(
                "max_upload_size must be between {MIN} and {MAX} bytes"
            )));
        }
        s.max_upload_size = mu;
    }

    Ok(Json(SettingsResponse::from(&*s)))
}
