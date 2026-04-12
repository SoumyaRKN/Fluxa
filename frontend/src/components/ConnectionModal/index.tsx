import { useState } from 'react';
import { useAcceptConnection, useRejectConnection } from '@/api/devices';
import { useAppStore } from '@/store';
import { Wifi, X, Check } from 'lucide-react';

export function ConnectionModal() {
    const { pendingConnectionRequest, setPendingConnectionRequest, addNotification } =
        useAppStore();
    const accept = useAcceptConnection();
    const reject = useRejectConnection();
    const [processing, setProcessing] = useState(false);

    if (!pendingConnectionRequest) return null;
    const { session_id, from_device_name, from_ip } = pendingConnectionRequest;

    async function handleAccept() {
        setProcessing(true);
        try {
            await accept.mutateAsync(session_id);
            addNotification({ type: 'success', message: `Connected to ${from_device_name}` });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        } finally {
            setPendingConnectionRequest(null);
            setProcessing(false);
        }
    }

    async function handleReject() {
        setProcessing(true);
        try {
            await reject.mutateAsync(session_id);
        } catch {
            // best-effort
        } finally {
            setPendingConnectionRequest(null);
            setProcessing(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-fade-in">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                        <Wifi size={28} className="text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-white font-semibold text-lg">Connection Request</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            <span className="text-cyan-400 font-medium">{from_device_name}</span>
                            {' '}wants to connect
                        </p>
                        <p className="text-slate-500 text-xs mt-1 font-mono">{from_ip}</p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={handleReject}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
                        >
                            <X size={16} />
                            Reject
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            <Check size={16} />
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
