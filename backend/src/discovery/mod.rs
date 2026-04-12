use chrono::Utc;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use tracing::{error, info, warn};

use crate::state::{AppState, DeviceInfo, WsEvent};

const SERVICE_TYPE: &str = "_fluxa._tcp.local.";

/// Spawn mDNS broadcast + discovery tasks.
pub async fn start(state: AppState) {
    let state_broadcast = state.clone();
    let state_query = state.clone();

    // Broadcast our own service
    tokio::spawn(async move {
        if let Err(e) = broadcast_service(&state_broadcast).await {
            error!("mDNS broadcast error: {e}");
        }
    });

    // Discover other Fluxa devices
    tokio::spawn(async move {
        if let Err(e) = discover_devices(&state_query).await {
            error!("mDNS discovery error: {e}");
        }
    });
}

async fn broadcast_service(state: &AppState) -> anyhow::Result<()> {
    let mdns = ServiceDaemon::new()?;

    let ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let host_name = format!("{}.local.", state.config.device_name.replace(' ', "-"));
    let port = state.config.port;
    let instance_name = format!("{}-fluxa", state.config.device_name.replace(' ', "-"));

    let mut properties = HashMap::new();
    properties.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
    properties.insert("platform".to_string(), std::env::consts::OS.to_string());
    properties.insert("name".to_string(), state.config.device_name.clone());

    let service_info = ServiceInfo::new(
        SERVICE_TYPE,
        &instance_name,
        &host_name,
        ip.as_str(),
        port,
        properties,
    )?;

    mdns.register(service_info)?;
    info!("mDNS: broadcasting as '{instance_name}' on port {port}");

    // Keep alive – the daemon runs in background threads
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
    }
}

async fn discover_devices(state: &AppState) -> anyhow::Result<()> {
    let mdns = ServiceDaemon::new()?;
    let receiver = mdns.browse(SERVICE_TYPE)?;
    let own_name = state.config.device_name.clone();

    info!("mDNS: browsing for Fluxa devices...");

    loop {
        match receiver.recv_async().await {
            Ok(ServiceEvent::ServiceResolved(info)) => {
                let name = info.get_fullname().to_string();
                let addresses: Vec<String> =
                    info.get_addresses().iter().map(|a| a.to_string()).collect();

                let ip = match addresses.first() {
                    Some(a) => a.clone(),
                    None => continue,
                };

                let port = info.get_port();
                let props = info.get_properties();

                let dev_name = props
                    .get("name")
                    .map(|v| v.val_str().to_string())
                    .unwrap_or_else(|| name.clone());

                // Skip ourselves
                if dev_name == own_name {
                    continue;
                }

                let platform = props
                    .get("platform")
                    .map(|v| v.val_str().to_string())
                    .unwrap_or_else(|| "unknown".to_string());

                let version = props
                    .get("version")
                    .map(|v| v.val_str().to_string())
                    .unwrap_or_else(|| "0.0.0".to_string());

                let device_id = format!("{dev_name}-{port}");

                let device = DeviceInfo {
                    id: device_id.clone(),
                    name: dev_name.clone(),
                    ip: ip.clone(),
                    port,
                    platform,
                    version,
                    discovered_at: Utc::now(),
                };

                let already_known = {
                    let devices = state.devices.read().await;
                    devices.iter().any(|d| d.id == device_id)
                };

                if !already_known {
                    info!("mDNS: discovered device '{dev_name}' at {ip}:{port}");
                    let mut devices = state.devices.write().await;
                    devices.push(device.clone());
                    drop(devices);
                    state.broadcast(WsEvent::DeviceDiscovered(device));
                }
            }

            Ok(ServiceEvent::ServiceRemoved(_, fullname)) => {
                let mut devices = state.devices.write().await;
                let before = devices.len();
                devices.retain(|d| !fullname.contains(&d.name));
                if devices.len() < before {
                    info!("mDNS: device removed ({})", fullname);
                    // Broadcast device lost events
                    // (we removed them, so just broadcast by fullname)
                    state.broadcast(WsEvent::DeviceLost {
                        device_id: fullname.clone(),
                    });
                }
            }

            Ok(_) => {}

            Err(e) => {
                warn!("mDNS receiver error: {e}");
                break;
            }
        }
    }

    Ok(())
}
