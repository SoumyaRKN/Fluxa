import { useState } from 'react';
import { Monitor, Wifi, WifiOff, Loader2, Link, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { useDevices, useRequestConnection } from '@/api/devices';
import { useAppStore } from '@/store';
import type { DeviceInfo } from '@/types';

function PlatformIcon({ platform }: { platform: string }) {
    const normalized = platform.toLowerCase();
    const icons: Record<string, string> = {
        linux: '🐧',
        macos: '🍎',
        windows: '🪟',
        android: '🤖',
        ios: '📱',
    };
    return <span className="text-base">{icons[normalized] ?? '💻'}</span>;
}

function DeviceCard({ device }: { device: DeviceInfo }) {
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const { addNotification } = useAppStore();
    const requestConn = useRequestConnection();
    const selfInfo = useAppStore((s) => s.selfInfo);

    async function handleConnect() {
        if (connecting || connected) return;
        setConnecting(true);
        try {
            await requestConn.mutateAsync({
                target_ip: device.ip,
                target_port: device.port,
                device_id: selfInfo?.id ?? 'unknown',
                device_name: selfInfo?.name ?? 'Unknown',
            });
            setConnected(true);
            addNotification({
                type: 'info',
                message: `Connection request sent to ${device.name}`,
                duration: 3000,
            });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        } finally {
            setConnecting(false);
        }
    }

    return (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-600 transition-all">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                        <PlatformIcon platform={device.platform} />
                    </div>
                    <div>
                        <p className="text-white font-medium text-sm">{device.name}</p>
                        <p className="text-slate-500 text-xs font-mono">{device.ip}:{device.port}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-green-400 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span>Online</span>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">v{device.version}</span>
                <button
                    onClick={handleConnect}
                    disabled={connecting || connected}
                    className={clsx(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium',
                        connected
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 hover:from-cyan-500/30 hover:to-indigo-500/30',
                    )}
                >
                    {connecting ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : connected ? (
                        <Check size={12} />
                    ) : (
                        <Link size={12} />
                    )}
                    {connecting ? 'Connecting...' : connected ? 'Requested' : 'Connect'}
                </button>
            </div>
        </div>
    );
}

export function DeviceList() {
    const { data: apiDevices, isLoading, refetch } = useDevices();
    const { devices: wsDevices } = useAppStore();

    // Merge API-fetched and WebSocket-discovered devices (prefer WS data)
    const allDevices: DeviceInfo[] = (() => {
        const map = new Map<string, DeviceInfo>();
        (apiDevices ?? []).forEach((d) => map.set(d.id, d));
        wsDevices.forEach((d) => map.set(d.id, d));
        return Array.from(map.values());
    })();

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Wifi size={16} className="text-cyan-400" />
                    <span className="text-white font-medium text-sm">Nearby Devices</span>
                </div>
                <button
                    onClick={() => refetch()}
                    className="text-slate-400 hover:text-white text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-all"
                >
                    <Loader2 size={12} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Device List */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading && allDevices.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                )}

                {!isLoading && allDevices.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 gap-3 text-slate-500">
                        <WifiOff size={32} className="opacity-40" />
                        <p className="text-sm text-center">
                            No devices found on your network.
                        </p>
                        <p className="text-xs text-center text-slate-600">
                            Make sure other Fluxa devices are running on the same LAN.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {allDevices.map((device) => (
                        <DeviceCard key={device.id} device={device} />
                    ))}
                </div>
            </div>
        </div>
    );
}
