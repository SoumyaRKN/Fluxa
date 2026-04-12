import { ArrowDownUp, CheckCircle2, XCircle, Clock, Loader2, ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store';
import type { TransferItem } from '@/types';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let unit = 0;
    while (val >= 1024 && unit < units.length - 1) {
        val /= 1024;
        unit++;
    }
    return `${val.toFixed(1)} ${units[unit]}`;
}

function TransferRow({ transfer }: { transfer: TransferItem }) {
    const isIncoming = transfer.direction === 'Incoming';

    const statusConfig = {
        Active: { color: 'text-cyan-400', label: 'Transferring', icon: <Loader2 size={14} className="animate-spin" /> },
        Pending: { color: 'text-slate-400', label: 'Pending', icon: <Clock size={14} /> },
        Completed: { color: 'text-green-400', label: 'Done', icon: <CheckCircle2 size={14} /> },
        Failed: { color: 'text-red-400', label: 'Failed', icon: <XCircle size={14} /> },
        Paused: { color: 'text-amber-400', label: 'Paused', icon: <Clock size={14} /> },
    };

    const { color, label, icon } = statusConfig[transfer.state];

    return (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3.5 flex flex-col gap-2.5">
            {/* Top row */}
            <div className="flex items-center gap-2">
                <div className={clsx('flex-shrink-0', isIncoming ? 'text-cyan-400' : 'text-violet-400')}>
                    {isIncoming ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                </div>
                <p className="text-white text-sm font-medium flex-1 truncate" title={transfer.file_name}>
                    {transfer.file_name}
                </p>
                <span className={clsx('flex items-center gap-1 text-xs flex-shrink-0', color)}>
                    {icon}
                    {label}
                </span>
            </div>

            {/* Progress bar */}
            {(transfer.state === 'Active' || transfer.state === 'Paused') && (
                <div className="space-y-1">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={clsx(
                                'h-full rounded-full transition-all duration-300',
                                isIncoming
                                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                                    : 'bg-gradient-to-r from-violet-500 to-violet-400',
                            )}
                            style={{ width: `${Math.min(transfer.percent, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>{formatBytes(transfer.bytes_transferred)}</span>
                        <span>{Math.round(transfer.percent)}% of {formatBytes(transfer.file_size)}</span>
                    </div>
                </div>
            )}

            {/* Completed size */}
            {transfer.state === 'Completed' && (
                <p className="text-xs text-slate-500">{formatBytes(transfer.file_size)}</p>
            )}
        </div>
    );
}

export function TransferPanel() {
    const { transfers, clearTransferHistory } = useAppStore();

    const active = transfers.filter((t) => t.state === 'Active' || t.state === 'Pending');
    const done = transfers.filter((t) => t.state === 'Completed' || t.state === 'Failed');

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                <ArrowDownUp size={16} className="text-violet-400" />
                <span className="text-white font-medium text-sm">Transfers</span>
                {active.length > 0 && (
                    <span className="ml-1 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full px-2 py-0.5">
                        {active.length} active
                    </span>
                )}
                <div className="flex-1" />
                {done.length > 0 && (
                    <button
                        onClick={clearTransferHistory}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                        title="Clear completed/failed transfers"
                    >
                        <Trash2 size={13} />
                        <span className="hidden sm:inline">Clear history</span>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transfers.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500">
                        <ArrowDownUp size={32} className="opacity-40" />
                        <p className="text-sm">No transfers yet</p>
                        <p className="text-xs text-slate-600">Files you send or receive will appear here</p>
                    </div>
                )}

                {active.length > 0 && (
                    <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active</h3>
                        <div className="space-y-2">
                            {active.map((t) => <TransferRow key={t.id} transfer={t} />)}
                        </div>
                    </section>
                )}

                {done.length > 0 && (
                    <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">History</h3>
                        <div className="space-y-2">
                            {done.map((t) => <TransferRow key={t.id} transfer={t} />)}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
