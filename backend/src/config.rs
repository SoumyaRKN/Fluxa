use std::net::IpAddr;
use std::path::PathBuf;

/// Runtime configuration for Fluxa backend.
#[derive(Debug, Clone)]
pub struct Config {
    /// Bind address for the HTTP server
    pub host: IpAddr,
    /// HTTP server port
    pub port: u16,
    /// Root directory to serve files from. Defaults to home directory.
    pub root_dir: PathBuf,
    /// Human-readable device name shown to other peers
    pub device_name: String,
    /// mDNS service name (informational – discovery uses its own constant)
    #[allow(dead_code)]
    pub mdns_service_type: String,
    /// Maximum upload size in bytes (default 4 GiB)
    pub max_upload_size: u64,
    /// Chunk size for chunked transfers (default 2 MiB)
    pub chunk_size: usize,
}

impl Config {
    pub fn from_env() -> Self {
        let host = std::env::var("FLUXA_HOST")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .unwrap_or(IpAddr::from([0, 0, 0, 0]));

        let port: u16 = std::env::var("FLUXA_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(7070);

        let root_dir = std::env::var("FLUXA_ROOT")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                dirs_home().unwrap_or_else(|| PathBuf::from("."))
            });

        let device_name = std::env::var("FLUXA_DEVICE_NAME")
            .unwrap_or_else(|_| {
                hostname::get()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned()
            });

        Config {
            host,
            port,
            root_dir,
            device_name,
            mdns_service_type: "_fluxa._tcp.local.".to_string(),
            max_upload_size: 4 * 1024 * 1024 * 1024, // 4 GiB
            chunk_size: 2 * 1024 * 1024,              // 2 MiB
        }
    }

    pub fn bind_addr(&self) -> std::net::SocketAddr {
        std::net::SocketAddr::new(self.host, self.port)
    }
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("USERPROFILE").map(PathBuf::from))
}
