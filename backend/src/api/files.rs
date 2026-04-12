use axum::{
    body::Body,
    extract::{Multipart, Query, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use chrono::{DateTime, Utc};
use mime_guess::from_path;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio_util::io::ReaderStream;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};

// ── Path helpers ───────────────────────────────────────────────────────────────

/// Resolve a user-supplied `path` relative to `root`.
/// Prevents path traversal attacks (OWASP A01).
pub fn safe_join(root: &Path, user_path: &str) -> AppResult<PathBuf> {
    // Normalize the user-supplied path by resolving . and ..
    let stripped = user_path
        .split('/')
        .filter(|s| !s.is_empty() && *s != ".")
        .collect::<Vec<_>>();

    let mut result = root.to_path_buf();
    for component in &stripped {
        if *component == ".." {
            // Going above root is a traversal attempt
            return Err(AppError::PathTraversal);
        }
        result.push(component);
    }

    // Double-check with canonical path comparison
    let canonical_root = root.canonicalize().map_err(AppError::Io)?;
    // result might not exist yet (e.g. mkdir) – walk up to the first existing ancestor
    let mut check = result.clone();
    while !check.exists() {
        if let Some(parent) = check.parent() {
            check = parent.to_path_buf();
        } else {
            break;
        }
    }
    if check.exists() {
        let canonical_check = check.canonicalize().map_err(AppError::Io)?;
        if !canonical_check.starts_with(&canonical_root) {
            return Err(AppError::PathTraversal);
        }
    }

    Ok(result)
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub kind: FileKind,
    pub size: u64,
    pub modified: Option<DateTime<Utc>>,
    pub mime: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    File,
    Directory,
    Symlink,
}

#[derive(Debug, Deserialize)]
pub struct PathQuery {
    pub path: Option<String>,
}

/// Extended query for `list_files` – supports toggling hidden-file visibility.
#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub path: Option<String>,
    /// Return entries whose names start with `.`  (default: false)
    pub show_hidden: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct RenameRequest {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Deserialize)]
pub struct CopyRequest {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Deserialize)]
pub struct MkdirRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteBatchRequest {
    pub paths: Vec<String>,
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/// GET /api/files?path=/  –  list directory contents
pub async fn list_files(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Vec<FileEntry>>> {
    let rel = q.path.unwrap_or_else(|| "/".to_string());
    let show_hidden = q.show_hidden.unwrap_or(false);
    let dir = safe_join(&state.config.root_dir, &rel)?;

    if !dir.exists() {
        return Err(AppError::NotFound(format!("Path not found: {rel}")));
    }
    if !dir.is_dir() {
        return Err(AppError::BadRequest(format!("Not a directory: {rel}")));
    }

    let mut entries = Vec::new();
    let mut reader = fs::read_dir(&dir).await.map_err(AppError::Io)?;

    while let Some(entry) = reader.next_entry().await.map_err(AppError::Io)? {
        let meta = match entry.metadata().await {
            Ok(m) => m,
            Err(_) => continue, // skip unreadable entries
        };

        let name = entry.file_name().to_string_lossy().into_owned();
        // Skip dot-prefixed (hidden) entries unless the caller requested them
        if !show_hidden && name.starts_with('.') {
            continue;
        }
        let full = entry.path();

        // Build the path relative to root for API responses
        let path_rel = full
            .strip_prefix(&state.config.root_dir)
            .unwrap_or(&full)
            .to_string_lossy()
            .into_owned();

        let kind = if meta.is_symlink() {
            FileKind::Symlink
        } else if meta.is_dir() {
            FileKind::Directory
        } else {
            FileKind::File
        };

        let mime = if kind == FileKind::File {
            Some(from_path(&name).first_or_octet_stream().to_string())
        } else {
            None
        };

        let modified = meta
            .modified()
            .ok()
            .map(|t| DateTime::<Utc>::from(t));

        entries.push(FileEntry {
            name,
            path: format!("/{}", path_rel),
            kind,
            size: meta.len(),
            modified,
            mime,
        });
    }

    // Sort: directories first, then by name (case-insensitive)
    entries.sort_by(|a, b| {
        let dir_cmp = b
            .kind
            .eq(&FileKind::Directory)
            .cmp(&a.kind.eq(&FileKind::Directory));
        dir_cmp.then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(Json(entries))
}

/// GET /api/download?path=...  –  stream file to client
pub async fn download_file(
    State(state): State<AppState>,
    Query(q): Query<PathQuery>,
) -> AppResult<Response> {
    let rel = q.path.ok_or_else(|| AppError::BadRequest("path is required".into()))?;
    let file_path = safe_join(&state.config.root_dir, &rel)?;

    if !file_path.exists() {
        return Err(AppError::NotFound(format!("File not found: {rel}")));
    }
    if file_path.is_dir() {
        return Err(AppError::BadRequest("Cannot download a directory".into()));
    }

    let file = fs::File::open(&file_path).await.map_err(AppError::Io)?;
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let file_name = file_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    let mime = from_path(&file_name).first_or_octet_stream().to_string();

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{file_name}\""),
        )
        .body(body)
        .unwrap())
}

/// POST /api/upload  –  multipart file upload
pub async fn upload_file(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    let mut dest_path: Option<String> = None;
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;
    let mut checksum: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::BadRequest(format!("Multipart error: {e}"))
    })? {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "path" => {
                let text = field.text().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read path field: {e}"))
                })?;
                dest_path = Some(text);
            }
            "checksum" => {
                let text = field.text().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read checksum: {e}"))
                })?;
                checksum = Some(text);
            }
            "file" => {
                file_name = field
                    .file_name()
                    .map(str::to_string)
                    .or_else(|| field.name().map(str::to_string));

                let bytes_data = field.bytes().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read file data: {e}"))
                })?;

                // Enforce upload size limit
                if bytes_data.len() as u64 > state.config.max_upload_size {
                    return Err(AppError::BadRequest(format!(
                        "File exceeds maximum allowed size of {} bytes",
                        state.config.max_upload_size
                    )));
                }

                file_data = Some(bytes_data.to_vec());
            }
            _ => {
                // Consume unknown fields
                let _ = field.bytes().await;
            }
        }
    }

    let data = file_data.ok_or_else(|| AppError::BadRequest("No file field in upload".into()))?;
    let name = file_name.unwrap_or_else(|| "upload".to_string());

    // Sanitize the filename
    let safe_name = sanitize_filename(&name);
    if safe_name.is_empty() {
        return Err(AppError::BadRequest("Invalid filename".into()));
    }

    // Determine destination directory
    let dest_dir = if let Some(p) = dest_path {
        safe_join(&state.config.root_dir, &p)?
    } else {
        state.config.root_dir.clone()
    };

    fs::create_dir_all(&dest_dir).await.map_err(AppError::Io)?;
    let final_path = dest_dir.join(&safe_name);

    // Verify SHA-256 checksum if provided
    if let Some(expected) = &checksum {
        let mut hasher = Sha256::new();
        hasher.update(&data);
        let actual = hex::encode(hasher.finalize());
        if actual != *expected {
            return Err(AppError::BadRequest(format!(
                "Checksum mismatch: expected {expected}, got {actual}"
            )));
        }
    }

    fs::write(&final_path, &data).await.map_err(AppError::Io)?;

    let relative = final_path
        .strip_prefix(&state.config.root_dir)
        .unwrap_or(&final_path)
        .to_string_lossy()
        .into_owned();

    Ok(Json(serde_json::json!({
        "success": true,
        "path": format!("/{relative}"),
        "size": data.len(),
    })))
}

/// DELETE /api/files?path=...  –  delete file or directory
pub async fn delete_path(
    State(state): State<AppState>,
    Query(q): Query<PathQuery>,
) -> AppResult<Json<serde_json::Value>> {
    let rel = q.path.ok_or_else(|| AppError::BadRequest("path is required".into()))?;
    let target = safe_join(&state.config.root_dir, &rel)?;

    if !target.exists() {
        return Err(AppError::NotFound(format!("Path not found: {rel}")));
    }

    if target.is_dir() {
        fs::remove_dir_all(&target).await.map_err(AppError::Io)?;
    } else {
        fs::remove_file(&target).await.map_err(AppError::Io)?;
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/rename  –  rename or move a file/directory
pub async fn rename_path(
    State(state): State<AppState>,
    Json(req): Json<RenameRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let from = safe_join(&state.config.root_dir, &req.from)?;
    let to = safe_join(&state.config.root_dir, &req.to)?;

    if !from.exists() {
        return Err(AppError::NotFound(format!("Source not found: {}", req.from)));
    }
    if to.exists() {
        return Err(AppError::Conflict(format!("Destination already exists: {}", req.to)));
    }

    fs::rename(&from, &to).await.map_err(AppError::Io)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/copy
pub async fn copy_path(
    State(state): State<AppState>,
    Json(req): Json<CopyRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let from = safe_join(&state.config.root_dir, &req.from)?;
    let to = safe_join(&state.config.root_dir, &req.to)?;

    if !from.exists() {
        return Err(AppError::NotFound(format!("Source not found: {}", req.from)));
    }
    if to.exists() {
        return Err(AppError::Conflict(format!("Destination already exists: {}", req.to)));
    }

    if from.is_dir() {
        copy_dir_all(&from, &to).await?;
    } else {
        if let Some(parent) = to.parent() {
            fs::create_dir_all(parent).await.map_err(AppError::Io)?;
        }
        fs::copy(&from, &to).await.map_err(AppError::Io)?;
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/mkdir
pub async fn make_dir(
    State(state): State<AppState>,
    Json(req): Json<MkdirRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let path = safe_join(&state.config.root_dir, &req.path)?;
    if path.exists() {
        return Err(AppError::Conflict(format!("Already exists: {}", req.path)));
    }
    fs::create_dir_all(&path).await.map_err(AppError::Io)?;
    Ok(Json(serde_json::json!({ "success": true })))
}

// ── Helpers ────────────────────────────────────────────────────────────────────

fn sanitize_filename(name: &str) -> String {
    // Remove path separators and null bytes; limit length
    name.chars()
        .filter(|&c| c != '/' && c != '\\' && c != '\0')
        .take(255)
        .collect::<String>()
        .trim()
        .to_string()
}

async fn copy_dir_all(src: &Path, dst: &Path) -> AppResult<()> {
    fs::create_dir_all(dst).await.map_err(AppError::Io)?;
    let mut reader = fs::read_dir(src).await.map_err(AppError::Io)?;
    while let Some(entry) = reader.next_entry().await.map_err(AppError::Io)? {
        let ty = entry.file_type().await.map_err(AppError::Io)?;
        let dest_child = dst.join(entry.file_name());
        if ty.is_dir() {
            Box::pin(copy_dir_all(&entry.path(), &dest_child)).await?;
        } else {
            fs::copy(&entry.path(), &dest_child)
                .await
                .map_err(AppError::Io)?;
        }
    }
    Ok(())
}

/// POST /api/files/delete-batch  –  delete multiple paths in one request
pub async fn delete_paths_batch(
    State(state): State<AppState>,
    Json(req): Json<DeleteBatchRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let mut deleted = 0usize;
    let mut errors: Vec<String> = Vec::new();

    for path in &req.paths {
        match safe_join(&state.config.root_dir, path) {
            Ok(target) => {
                if !target.exists() {
                    errors.push(format!("{path}: not found"));
                    continue;
                }
                let result = if target.is_dir() {
                    fs::remove_dir_all(&target).await
                } else {
                    fs::remove_file(&target).await
                };
                match result {
                    Ok(_) => deleted += 1,
                    Err(e) => errors.push(format!("{path}: {e}")),
                }
            }
            Err(_) => errors.push(format!("{path}: path traversal blocked")),
        }
    }

    Ok(Json(serde_json::json!({
        "deleted": deleted,
        "errors": errors,
    })))
}

/// GET /api/file/view?path=...  –  return text/UTF-8 content (≤ 2 MiB)
pub async fn view_file(
    State(state): State<AppState>,
    Query(q): Query<PathQuery>,
) -> AppResult<Json<serde_json::Value>> {
    use tokio::io::AsyncReadExt;

    let rel = q.path.ok_or_else(|| AppError::BadRequest("path is required".into()))?;
    let file_path = safe_join(&state.config.root_dir, &rel)?;

    if !file_path.exists() {
        return Err(AppError::NotFound(format!("File not found: {rel}")));
    }
    if file_path.is_dir() {
        return Err(AppError::BadRequest("Cannot view a directory".into()));
    }

    let meta = fs::metadata(&file_path).await.map_err(AppError::Io)?;
    let size = meta.len();

    const MAX_VIEW: u64 = 2 * 1024 * 1024; // 2 MiB
    let read_size = std::cmp::min(size, MAX_VIEW) as usize;
    let truncated = size > MAX_VIEW;

    let file_name = file_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let mime = from_path(&file_name).first_or_octet_stream().to_string();

    let mut buf = vec![0u8; read_size];
    let mut file = tokio::fs::File::open(&file_path).await.map_err(AppError::Io)?;
    if read_size > 0 {
        file.read_exact(&mut buf).await.map_err(AppError::Io)?;
    }

    if !is_text_mime(&mime) && !is_utf8_heuristic(&buf) {
        return Err(AppError::BadRequest(
            "Binary file — use the preview endpoint for media types".into(),
        ));
    }

    let content = String::from_utf8_lossy(&buf).into_owned();
    Ok(Json(serde_json::json!({
        "content": content,
        "mime": mime,
        "size": size,
        "truncated": truncated,
        "encoding": "utf-8",
    })))
}

/// GET /api/file/preview?path=...  –  stream file with `Content-Disposition: inline`
pub async fn preview_file(
    State(state): State<AppState>,
    Query(q): Query<PathQuery>,
) -> AppResult<Response> {
    let rel = q.path.ok_or_else(|| AppError::BadRequest("path is required".into()))?;
    let file_path = safe_join(&state.config.root_dir, &rel)?;

    if !file_path.exists() {
        return Err(AppError::NotFound(format!("File not found: {rel}")));
    }
    if file_path.is_dir() {
        return Err(AppError::BadRequest("Cannot preview a directory".into()));
    }

    let file_name = file_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let mime = from_path(&file_name).first_or_octet_stream().to_string();

    let file = fs::File::open(&file_path).await.map_err(AppError::Io)?;
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{file_name}\""),
        )
        .body(body)
        .unwrap())
}

// ── Text-detection helpers ─────────────────────────────────────────────────────

fn is_text_mime(mime: &str) -> bool {
    mime.starts_with("text/")
        || matches!(
            mime,
            "application/json"
                | "application/xml"
                | "application/javascript"
                | "application/x-sh"
                | "application/x-shellscript"
                | "application/toml"
        )
        || mime.contains("+xml")
        || mime.contains("+json")
}

fn is_utf8_heuristic(bytes: &[u8]) -> bool {
    if bytes.is_empty() {
        return true;
    }
    let sample = &bytes[..bytes.len().min(4096)];
    !sample.contains(&0u8) && std::str::from_utf8(sample).is_ok()
}
