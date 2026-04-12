import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
    DeviceInfo,
    FileEntry,
    Notification,
    Session,
    SelfInfo,
    TransferItem,
    ViewLayout,
    SortField,
    SortDirection,
} from '@/types';

interface AppStore {
    // Navigation
    currentPath: string;
    setCurrentPath: (path: string) => void;

    // File Explorer
    files: FileEntry[];
    setFiles: (files: FileEntry[]) => void;
    selectedFiles: Set<string>;
    toggleSelectFile: (path: string) => void;
    clearSelection: () => void;

    // Devices
    devices: DeviceInfo[];
    selfInfo: SelfInfo | null;
    setSelfInfo: (info: SelfInfo) => void;
    addDevice: (device: DeviceInfo) => void;
    removeDevice: (deviceId: string) => void;
    setDevices: (devices: DeviceInfo[]) => void;

    // Sessions
    sessions: Session[];
    addSession: (session: Session) => void;
    updateSessionState: (sessionId: string, state: Session['state']) => void;

    // Transfers
    transfers: TransferItem[];
    addTransfer: (transfer: TransferItem) => void;
    updateTransferProgress: (
        transferId: string,
        bytesTransferred: number,
        percent: number,
    ) => void;
    completeTransfer: (transferId: string) => void;
    failTransfer: (transferId: string, reason: string) => void;
    clearTransferHistory: () => void;

    // UI
    activePanel: 'files' | 'devices' | 'transfers';
    setActivePanel: (panel: 'files' | 'devices' | 'transfers') => void;
    showQRModal: boolean;
    setShowQRModal: (v: boolean) => void;
    pendingConnectionRequest: {
        session_id: string;
        from_device_name: string;
        from_ip: string;
    } | null;
    setPendingConnectionRequest: (
        req: {
            session_id: string;
            from_device_name: string;
            from_ip: string;
        } | null,
    ) => void;

    // Notifications
    notifications: Notification[];
    addNotification: (n: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;

    // Explorer settings (persisted in-memory for the session)
    viewLayout: ViewLayout;
    setViewLayout: (l: ViewLayout) => void;
    showHidden: boolean;
    setShowHidden: (v: boolean) => void;
    sortField: SortField;
    sortDir: SortDirection;
    setSort: (field: SortField, dir: SortDirection) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    previewEntry: FileEntry | null;
    setPreviewEntry: (e: FileEntry | null) => void;
}

export const useAppStore = create<AppStore>()(
    immer((set) => ({
        // Navigation
        currentPath: '/',
        setCurrentPath: (path) => set((s) => { s.currentPath = path; }),

        // File Explorer
        files: [],
        setFiles: (files) => set((s) => { s.files = files; }),
        selectedFiles: new Set(),
        toggleSelectFile: (path) =>
            set((s) => {
                if (s.selectedFiles.has(path)) {
                    s.selectedFiles.delete(path);
                } else {
                    s.selectedFiles.add(path);
                }
            }),
        clearSelection: () => set((s) => { s.selectedFiles = new Set(); }),

        // Devices
        devices: [],
        selfInfo: null,
        setSelfInfo: (info) => set((s) => { s.selfInfo = info; }),
        addDevice: (device) =>
            set((s) => {
                const exists = s.devices.some((d) => d.id === device.id);
                if (!exists) s.devices.push(device);
            }),
        removeDevice: (deviceId) =>
            set((s) => {
                s.devices = s.devices.filter((d) => d.id !== deviceId);
            }),
        setDevices: (devices) => set((s) => { s.devices = devices; }),

        // Sessions
        sessions: [],
        addSession: (session) => set((s) => { s.sessions.push(session); }),
        updateSessionState: (sessionId, state) =>
            set((s) => {
                const sess = s.sessions.find((x) => x.id === sessionId);
                if (sess) sess.state = state;
            }),

        // Transfers
        transfers: [],
        addTransfer: (t) => set((s) => { s.transfers.unshift(t); }),
        updateTransferProgress: (transferId, bytesTransferred, percent) =>
            set((s) => {
                const t = s.transfers.find((x) => x.id === transferId);
                if (t) {
                    t.bytes_transferred = bytesTransferred;
                    t.percent = percent;
                    t.state = 'Active';
                }
            }),
        completeTransfer: (transferId) =>
            set((s) => {
                const t = s.transfers.find((x) => x.id === transferId);
                if (t) {
                    t.state = 'Completed';
                    t.percent = 100;
                }
            }),
        failTransfer: (transferId, _reason) =>
            set((s) => {
                const t = s.transfers.find((x) => x.id === transferId);
                if (t) t.state = 'Failed';
            }),
        clearTransferHistory: () =>
            set((s) => {
                s.transfers = s.transfers.filter(
                    (t) => t.state === 'Active' || t.state === 'Pending',
                );
            }),

        // UI
        activePanel: 'files',
        setActivePanel: (panel) => set((s) => { s.activePanel = panel; }),
        showQRModal: false,
        setShowQRModal: (v) => set((s) => { s.showQRModal = v; }),
        pendingConnectionRequest: null,
        setPendingConnectionRequest: (req) =>
            set((s) => { s.pendingConnectionRequest = req; }),

        // Notifications
        notifications: [],
        addNotification: (n) =>
            set((s) => {
                s.notifications.push({ ...n, id: crypto.randomUUID() });
            }),
        removeNotification: (id) =>
            set((s) => {
                s.notifications = s.notifications.filter((x) => x.id !== id);
            }),

        // Explorer settings
        viewLayout: 'list',
        setViewLayout: (l) => set((s) => { s.viewLayout = l; }),
        showHidden: false,
        setShowHidden: (v) => set((s) => { s.showHidden = v; }),
        sortField: 'name',
        sortDir: 'asc',
        setSort: (field, dir) => set((s) => { s.sortField = field; s.sortDir = dir; }),
        searchQuery: '',
        setSearchQuery: (q) => set((s) => { s.searchQuery = q; }),
        previewEntry: null,
        setPreviewEntry: (e) => set((s) => { s.previewEntry = e; }),
    })),
);
