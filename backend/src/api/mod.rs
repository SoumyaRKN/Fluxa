pub mod connection;
pub mod devices;
pub mod files;
pub mod settings;
pub mod transfer;

use axum::{routing::{delete, get, patch, post}, Router};
use crate::state::AppState;

/// Build the full REST API router.
pub fn router() -> Router<AppState> {
    Router::new()
        // File system operations
        .route("/api/files", get(files::list_files))
        .route("/api/files", delete(files::delete_path))
        .route("/api/mkdir", post(files::make_dir))
        .route("/api/rename", post(files::rename_path))
        .route("/api/copy", post(files::copy_path))
        .route("/api/upload", post(files::upload_file))
        .route("/api/download", get(files::download_file))
        // Device info
        .route("/api/devices", get(devices::list_devices))
        .route("/api/device/info", get(devices::self_info))
        // Connection management
        .route("/api/connect/request", post(connection::request_connection))
        .route("/api/connect/notify", post(connection::notify_connection))
        .route("/api/connect/accept", post(connection::accept_connection))
        .route("/api/connect/peer-accept", post(connection::peer_accept_connection))
        .route("/api/connect/reject", post(connection::reject_connection))
        .route("/api/connect/peer-reject", post(connection::peer_reject_connection))
        .route("/api/sessions", get(connection::list_sessions))
        // Transfer management
        .route("/api/transfer/init", post(transfer::init_transfer))
        .route("/api/transfer/chunk", post(transfer::receive_chunk))
        .route("/api/transfer/status/{id}", get(transfer::transfer_status))
        .route("/api/transfer/{id}/chunks", get(transfer::transfer_chunks))
        .route("/api/transfer/list", get(transfer::list_transfers))
        // Batch file operations
        .route("/api/files/delete-batch", post(files::delete_paths_batch))
        // File viewer (text content) and inline preview (images, video, audio, PDF)
        .route("/api/file/view", get(files::view_file))
        .route("/api/file/preview", get(files::preview_file))
        // Runtime settings
        .route("/api/settings", get(settings::get_settings))
        .route("/api/settings", patch(settings::patch_settings))
}
