import { QrCode, Wifi } from 'lucide-react';
import logoSvg from '@/assets/logo.svg';
import { useAppStore } from '@/store';

export function Header() {
    const { selfInfo, setShowQRModal, devices } = useAppStore();

    return (
        <header className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 z-10">
            {/* Logo + Brand */}
            <div className="flex items-center gap-2.5 select-none">
                <img src={logoSvg} alt="Fluxa logo" className="h-8 w-8" />
                <span className="text-white font-bold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                    Fluxa
                </span>
            </div>

            <div className="flex-1" />

            {/* Device name + status */}
            {selfInfo && (
                <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-mono">{selfInfo.name}</span>
                </div>
            )}

            {/* Nearby device count */}
            {devices.length > 0 && (
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1">
                    <Wifi size={12} />
                    <span>{devices.length} nearby</span>
                </div>
            )}

            {/* QR Code button */}
            <button
                onClick={() => setShowQRModal(true)}
                title="Show QR Code"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
                <QrCode size={18} />
            </button>
        </header>
    );
}
