// ── File System ─────────────────────────────────────────────────────────────────

export type FileKind = 'file' | 'directory' | 'symlink';

export interface FileEntry {
    name: string;
    path: string;
    kind: FileKind;
    size: number;
    modified: string | null;
    mime: string | null;
}

// ── Device ─────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
    id: string;
    name: string;
    ip: string;
    port: number;
    platform: string;
    version: string;
    discovered_at: string;
}

export interface SelfInfo {
    id: string;
    name: string;
    ip: string;
    port: number;
    platform: string;
    version: string;
}

// ── Session / Connection ───────────────────────────────────────────────────────

export type SessionState = 'Pending' | 'Active' | 'Rejected' | 'Expired';

export interface Session {
    id: string;
    device_id: string;
    device_name: string;
    device_ip: string;
    state: SessionState;
    created_at: string;
}

// ── Transfer ───────────────────────────────────────────────────────────────────

export type TransferState = 'Pending' | 'Active' | 'Paused' | 'Completed' | 'Failed';
export type TransferDirection = 'Incoming' | 'Outgoing';

export interface TransferItem {
    id: string;
    file_name: string;
    file_size: number;
    bytes_transferred: number;
    percent: number;
    state: TransferState;
    direction: TransferDirection;
}

// ── WebSocket Events ───────────────────────────────────────────────────────────

export interface WsConnectRequest {
    type: 'ConnectRequest';
    payload: {
        session_id: string;
        from_device_id: string;
        from_device_name: string;
        from_ip: string;
    };
}

export interface WsConnectAccept {
    type: 'ConnectAccept';
    payload: { session_id: string; from: string };
}

export interface WsConnectReject {
    type: 'ConnectReject';
    payload: { session_id: string; from: string };
}

export interface WsTransferStart {
    type: 'TransferStart';
    payload: TransferItem;
}

export interface WsTransferProgress {
    type: 'TransferProgress';
    payload: {
        transfer_id: string;
        bytes_transferred: number;
        total_bytes: number;
        percent: number;
        chunks_completed: number;
    };
}

export interface WsTransferComplete {
    type: 'TransferComplete';
    payload: { transfer_id: string };
}

export interface WsTransferFailed {
    type: 'TransferFailed';
    payload: { transfer_id: string; reason: string };
}

export interface WsDeviceDiscovered {
    type: 'DeviceDiscovered';
    payload: DeviceInfo;
}

export interface WsDeviceLost {
    type: 'DeviceLost';
    payload: { device_id: string };
}

export type WsMessage =
    | WsConnectRequest
    | WsConnectAccept
    | WsConnectReject
    | WsTransferStart
    | WsTransferProgress
    | WsTransferComplete
    | WsTransferFailed
    | WsDeviceDiscovered
    | WsDeviceLost;

// ── UI State ───────────────────────────────────────────────────────────────────

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
    duration?: number;
}
// ── File Explorer Settings ──────────────────────────────────────────

export type ViewLayout = 'list' | 'grid' | 'table';
export type SortField = 'name' | 'size' | 'modified' | 'kind';
export type SortDirection = 'asc' | 'desc';

export interface FilePreviewData {
    content: string;
    mime: string;
    size: number;
    truncated: boolean;
    encoding: 'utf-8';
}

// ── Settings ───────────────────────────────────────────────────────────────────

export interface AppSettings {
    device_name: string;
    root_dir: string;
    chunk_size: number;
    max_upload_size: number;
}

export type SettingsPatch = Partial<AppSettings>;