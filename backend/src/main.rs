use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    limit::RequestBodyLimitLayer,
    trace::TraceLayer,
};
use axum::{
    body::Body,
    http::{header, StatusCode, Uri},
    response::Response,
    routing::get,
    Router,
};
use rust_embed::RustEmbed;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use chrono::Utc;

#[derive(RustEmbed)]
#[folder = "public/"]
struct Assets;

async fn serve_asset(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .header(header::CONTENT_TYPE, mime.as_ref())
                .body(Body::from(content.data))
                .unwrap()
        }
        None => match Assets::get("index.html") {
            Some(content) => Response::builder()
                .header(header::CONTENT_TYPE, "text/html")
                .body(Body::from(content.data))
                .unwrap(),
            None => Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::from("Not found"))
                .unwrap(),
        },
    }
}

mod api;
mod config;
mod discovery;
mod error;
mod state;
mod websocket;

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialise tracing / logging
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "fluxa_backend=debug,tower_http=info".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env();
    let bind_addr = config.bind_addr();
    let max_upload = config.max_upload_size;

    info!("Starting Fluxa backend");
    info!("  Device name : {}", config.device_name);
    info!("  Root dir    : {}", config.root_dir.display());
    info!("  Bind        : {}", bind_addr);

    let state = AppState::new(config);

    // Start mDNS discovery/broadcast in background
    discovery::start(state.clone()).await;

    // Session timeout cleanup: remove Pending sessions older than 60 s every 30 s
    {
        use crate::state::SessionState;
        let cleanup_state = state.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                let now = Utc::now();
                cleanup_state.sessions.retain(|_, session| {
                    !(session.state == SessionState::Pending
                        && now.signed_duration_since(session.created_at).num_seconds() > 60)
                });
            }
        });
    }

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/ws", get(websocket::ws_handler))
        .merge(api::router())
        .route("/health", get(|| async { "OK" }))
        .fallback(serve_asset)
        .layer(cors)
        .layer(RequestBodyLimitLayer::new(max_upload as usize))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    info!("Fluxa listening on http://{}", bind_addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
