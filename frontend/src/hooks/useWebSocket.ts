import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import type { WsMessage } from '@/types';

const WS_URL = (() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_WS_HOST ?? window.location.host;
    return `${proto}://${host}/ws`;
})();

const RECONNECT_INTERVAL = 3_000;

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        addDevice,
        removeDevice,
        setPendingConnectionRequest,
        updateSessionState,
        addTransfer,
        updateTransferProgress,
        completeTransfer,
        failTransfer,
        addNotification,
    } = useAppStore();

    useEffect(() => {
        function connect() {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                addNotification({ type: 'success', message: 'Connected to Fluxa server', duration: 2000 });
            };

            ws.onmessage = (event) => {
                try {
                    const msg: WsMessage = JSON.parse(event.data);
                    handleMessage(msg);
                } catch {
                    // ignore malformed frames
                }
            };

            ws.onclose = () => {
                reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL);
            };

            ws.onerror = () => {
                ws.close();
            };
        }

        function handleMessage(msg: WsMessage) {
            switch (msg.type) {
                case 'DeviceDiscovered':
                    addDevice(msg.payload);
                    addNotification({
                        type: 'info',
                        message: `Device discovered: ${msg.payload.name}`,
                        duration: 3000,
                    });
                    break;

                case 'DeviceLost':
                    removeDevice(msg.payload.device_id);
                    break;

                case 'ConnectRequest':
                    setPendingConnectionRequest({
                        session_id: msg.payload.session_id,
                        from_device_name: msg.payload.from_device_name,
                        from_ip: msg.payload.from_ip,
                    });
                    break;

                case 'ConnectAccept':
                    updateSessionState(msg.payload.session_id, 'Active');
                    addNotification({
                        type: 'success',
                        message: `${msg.payload.from} accepted your connection`,
                        duration: 4000,
                    });
                    break;

                case 'ConnectReject':
                    updateSessionState(msg.payload.session_id, 'Rejected');
                    addNotification({
                        type: 'warning',
                        message: `${msg.payload.from} rejected connection`,
                        duration: 4000,
                    });
                    break;

                case 'TransferStart':
                    addTransfer({
                        id: msg.payload.id,
                        file_name: msg.payload.file_name,
                        file_size: msg.payload.file_size,
                        bytes_transferred: 0,
                        percent: 0,
                        state: 'Active',
                        direction: msg.payload.direction,
                    });
                    break;

                case 'TransferProgress':
                    updateTransferProgress(
                        msg.payload.transfer_id,
                        msg.payload.bytes_transferred,
                        msg.payload.percent,
                    );
                    break;

                case 'TransferComplete':
                    completeTransfer(msg.payload.transfer_id);
                    addNotification({
                        type: 'success',
                        message: 'Transfer completed!',
                        duration: 4000,
                    });
                    break;

                case 'TransferFailed':
                    failTransfer(msg.payload.transfer_id, msg.payload.reason);
                    addNotification({
                        type: 'error',
                        message: `Transfer failed: ${msg.payload.reason}`,
                        duration: 5000,
                    });
                    break;
            }
        }

        connect();

        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return wsRef;
}
