import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { useAppStore } from '@/store';

export function QRCodeModal() {
    const { selfInfo, showQRModal, setShowQRModal } = useAppStore();

    if (!showQRModal || !selfInfo) return null;

    const url = `http://${selfInfo.ip}:${selfInfo.port}`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-semibold text-lg">Connect via QR Code</h2>
                    <button
                        onClick={() => setShowQRModal(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl">
                        <QRCodeSVG value={url} size={180} level="M" />
                    </div>
                    <p className="text-slate-300 text-sm text-center">
                        Scan with another Fluxa device to connect
                    </p>
                    <div className="bg-slate-700/50 rounded-lg px-4 py-2 w-full text-center">
                        <span className="text-cyan-400 font-mono text-sm select-all">{url}</span>
                    </div>
                    <div className="text-xs text-slate-500 text-center">
                        <span className="font-medium text-slate-400">{selfInfo.name}</span>
                        {' · '}{selfInfo.platform}
                    </div>
                </div>
            </div>
        </div>
    );
}
