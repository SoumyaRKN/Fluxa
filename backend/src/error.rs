use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
#[allow(dead_code)] // some variants are reserved for future endpoints
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Path traversal detected")]
    PathTraversal,

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Transfer not found: {0}")]
    TransferNotFound(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Io(e) if e.kind() == std::io::ErrorKind::NotFound => {
                (StatusCode::NOT_FOUND, self.to_string())
            }
            AppError::Io(e) if e.kind() == std::io::ErrorKind::PermissionDenied => {
                (StatusCode::FORBIDDEN, self.to_string())
            }
            AppError::Io(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AppError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Forbidden(_) | AppError::PathTraversal => {
                (StatusCode::FORBIDDEN, self.to_string())
            }
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Conflict(_) => (StatusCode::CONFLICT, self.to_string()),
            AppError::SessionNotFound(_) | AppError::TransferNotFound(_) => {
                (StatusCode::NOT_FOUND, self.to_string())
            }
            AppError::Internal(_) | AppError::Serialization(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, self.to_string())
            }
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}
