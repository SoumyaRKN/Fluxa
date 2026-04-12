import { useEffect } from 'react';
import { CheckCircle, Info, AlertCircle, XCircle, X } from 'lucide-react';
import { useAppStore } from '@/store';
import type { Notification } from '@/types';

const icons = {
    success: <CheckCircle size={16} className="text-green-400" />,
    info: <Info size={16} className="text-cyan-400" />,
    warning: <AlertCircle size={16} className="text-amber-400" />,
    error: <XCircle size={16} className="text-red-400" />,
};

const borders = {
    success: 'border-green-500/30',
    info: 'border-cyan-500/30',
    warning: 'border-amber-500/30',
    error: 'border-red-500/30',
};

function NotificationItem({ n }: { n: Notification }) {
    const { removeNotification } = useAppStore();

    useEffect(() => {
        if (n.duration) {
            const t = setTimeout(() => removeNotification(n.id), n.duration);
            return () => clearTimeout(t);
        }
    }, [n.id, n.duration, removeNotification]);

    return (
        <div
            className={`flex items-center gap-3 bg-slate-800/90 backdrop-blur-sm border ${borders[n.type]} rounded-xl px-4 py-3 shadow-xl max-w-sm w-full animate-slide-in`}
        >
            {icons[n.type]}
            <p className="text-slate-200 text-sm flex-1">{n.message}</p>
            <button
                onClick={() => removeNotification(n.id)}
                className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function NotificationStack() {
    const { notifications } = useAppStore();

    return (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
            {notifications.map((n) => (
                <div key={n.id} className="pointer-events-auto">
                    <NotificationItem n={n} />
                </div>
            ))}
        </div>
    );
}
