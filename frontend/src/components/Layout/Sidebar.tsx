import { Folder, Monitor, ArrowDownUp } from 'lucide-react';
import { useAppStore } from '@/store';
import clsx from 'clsx';

const navItems = [
    { id: 'files' as const, label: 'Files', icon: Folder },
    { id: 'devices' as const, label: 'Devices', icon: Monitor },
    { id: 'transfers' as const, label: 'Transfers', icon: ArrowDownUp },
];

export function Sidebar() {
    const { activePanel, setActivePanel, transfers } = useAppStore();

    const activeTransfers = transfers.filter(
        (t) => t.state === 'Active' || t.state === 'Pending',
    ).length;

    return (
        <nav className="w-16 sm:w-52 bg-slate-900/80 border-r border-slate-800 flex flex-col py-4 flex-shrink-0">
            <div className="flex flex-col gap-1 px-2">
                {navItems.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActivePanel(id)}
                        className={clsx(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                            activePanel === id
                                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800',
                        )}
                    >
                        <Icon size={18} className="flex-shrink-0" />
                        <span className="hidden sm:block">{label}</span>
                        {id === 'transfers' && activeTransfers > 0 && (
                            <span className="hidden sm:flex ml-auto bg-cyan-500 text-white text-xs w-5 h-5 rounded-full items-center justify-center">
                                {activeTransfers}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* Footer version */}
            <div className="px-4 pb-2 hidden sm:block">
                <p className="text-slate-600 text-xs">v1.0.3</p>
            </div>
        </nav>
    );
}
