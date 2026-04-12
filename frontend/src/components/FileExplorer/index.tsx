import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Folder,
    File,
    FileText,
    Image,
    Video,
    Music,
    Archive,
    Code2,
    Upload,
    FolderPlus,
    RefreshCw,
    ChevronRight,
    Home,
    ArrowLeft,
    Download,
    Trash2,
    Edit3,
    Copy,
    AlertCircle,
    Loader2,
    Eye,
    EyeOff,
    LayoutGrid,
    LayoutList,
    AlignJustify,
    Search,
    X,
    ChevronUp,
    ChevronDown,
    Scissors,
    Clipboard,
    Check,
    Square,
    Info,
    CheckSquare,
    MousePointer2,
    MoreHorizontal,
    Calendar,
    FolderOpen,
} from 'lucide-react';
import clsx from 'clsx';
import {
    useFileList,
    useDeleteMutation,
    useDeleteBatchMutation,
    useRenameMutation,
    useMkdirMutation,
    useUploadMutation,
    useCopyMutation,
    downloadFile,
    useFileView,
    previewUrl,
} from '@/api/files';
import { useAppStore } from '@/store';
import type { FileEntry, ViewLayout, SortField, SortDirection } from '@/types';

// ── Format helpers ─────────────────────────────────────────────────────────────

function formatSize(bytes: number, isDir = false): string {
    if (isDir) return '—';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let val = bytes;
    let u = 0;
    while (val >= 1024 && u < units.length - 1) { val /= 1024; u++; }
    return `${val.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

function formatDate(s: string | null): string {
    if (!s) return '—';
    return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isTextMime(mime: string | null): boolean {
    if (!mime) return false;
    if (mime.startsWith('text/')) return true;
    return ['application/json', 'application/xml', 'application/javascript',
        'application/x-sh', 'application/toml', 'application/x-shellscript'].includes(mime);
}

// ── File type icon ─────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

function getFileIcon(entry: FileEntry): { Icon: IconComponent; color: string } {
    if (entry.kind === 'directory') return { Icon: Folder, color: 'text-amber-400' };
    const mime = entry.mime ?? '';
    const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
    if (mime.startsWith('image/')) return { Icon: Image, color: 'text-cyan-400' };
    if (mime.startsWith('video/')) return { Icon: Video, color: 'text-violet-400' };
    if (mime.startsWith('audio/')) return { Icon: Music, color: 'text-pink-400' };
    if (mime === 'application/pdf') return { Icon: FileText, color: 'text-red-400' };
    const codeExts = new Set([
        'js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp',
        'cs', 'rb', 'php', 'swift', 'kt', 'sh', 'bash', 'zsh', 'fish', 'lua', 'vim',
        'ml', 'hs', 'ex', 'exs', 'clj', 'elm', 'dart', 'r', 'sql', 'css', 'scss',
        'sass', 'html', 'htm', 'xml', 'yml', 'yaml', 'toml', 'json', 'md', 'mdx',
        'graphql', 'proto', 'tf', 'env',
    ]);
    if (codeExts.has(ext) || mime === 'application/javascript') return { Icon: Code2, color: 'text-green-400' };
    const archiveExts = new Set(['zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z', 'tgz', 'br', 'whl', 'deb', 'rpm']);
    if (archiveExts.has(ext)) return { Icon: Archive, color: 'text-yellow-400' };
    if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') {
        return { Icon: FileText, color: 'text-blue-400' };
    }
    return { Icon: File, color: 'text-slate-400' };
}

// ── Layout definitions ─────────────────────────────────────────────────────────

const LAYOUTS: { mode: ViewLayout; Icon: IconComponent; label: string }[] = [
    { mode: 'list', Icon: LayoutList, label: 'List view' },
    { mode: 'grid', Icon: LayoutGrid, label: 'Grid view' },
    { mode: 'table', Icon: AlignJustify, label: 'Table view' },
];

// ── Breadcrumb ─────────────────────────────────────────────────────────────────

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
    const parts = path.split('/').filter(Boolean);
    return (
        <nav className="flex items-center gap-1 text-sm text-slate-400 min-w-0 flex-wrap">
            <button onClick={() => onNavigate('/')} className="hover:text-white transition-colors flex-shrink-0">
                <Home size={14} />
            </button>
            {parts.map((part, i) => {
                const buildPath = '/' + parts.slice(0, i + 1).join('/');
                return (
                    <span key={buildPath} className="flex items-center gap-1 min-w-0">
                        <ChevronRight size={12} className="flex-shrink-0" />
                        <button
                            onClick={() => onNavigate(buildPath)}
                            className={clsx(
                                'hover:text-white transition-colors truncate max-w-[120px]',
                                i === parts.length - 1 && 'text-white font-medium',
                            )}
                            title={part}
                        >
                            {part}
                        </button>
                    </span>
                );
            })}
        </nav>
    );
}

// ── Context Menu ───────────────────────────────────────────────────────────────

interface ContextMenuState { x: number; y: number; entry: FileEntry }

function CtxItem({
    icon, label, onClick, danger, disabled,
}: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={clsx(
                'flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left transition-colors',
                danger ? 'text-red-400 hover:text-red-300 hover:bg-slate-700'
                    : disabled ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700',
            )}
        >
            {icon}{label}
        </button>
    );
}

function CtxDivider() {
    return <div className="my-1 border-t border-slate-700/70" />;
}

function ContextMenu({
    state, onClose, onOpen, onPreview, onDelete, onRename, onDownload,
    onCut, onCopy, onPaste, onProperties, canPaste,
}: {
    state: ContextMenuState;
    onClose: () => void;
    onOpen: (entry: FileEntry) => void;
    onPreview: (entry: FileEntry) => void;
    onDelete: (path: string) => void;
    onRename: (entry: FileEntry) => void;
    onDownload: (path: string) => void;
    onCut: (entry: FileEntry) => void;
    onCopy: (entry: FileEntry) => void;
    onPaste: () => void;
    onProperties: (entry: FileEntry) => void;
    canPaste: boolean;
}) {
    const e = state.entry;
    // Clamp to viewport so menu doesn't go off-screen
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(state.x, vw - 180);
    const top = Math.min(state.y, vh - 260);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 min-w-[180px]"
                style={{ left, top }}
            >
                {/* Open */}
                {e.kind === 'directory' && (
                    <CtxItem icon={<Folder size={14} />} label="Open" onClick={() => { onOpen(e); onClose(); }} />
                )}
                {e.kind === 'file' && (
                    <CtxItem icon={<Eye size={14} />} label="Preview" onClick={() => { onPreview(e); onClose(); }} />
                )}
                {e.kind === 'file' && (
                    <CtxItem icon={<Download size={14} />} label="Download" onClick={() => { onDownload(e.path); onClose(); }} />
                )}

                <CtxDivider />

                {/* Clipboard */}
                <CtxItem icon={<Scissors size={14} />} label="Cut" onClick={() => { onCut(e); onClose(); }} />
                <CtxItem icon={<Copy size={14} />} label="Copy" onClick={() => { onCopy(e); onClose(); }} />
                <CtxItem icon={<Clipboard size={14} />} label="Paste" onClick={() => { onPaste(); onClose(); }} disabled={!canPaste} />

                <CtxDivider />

                {/* Manage */}
                <CtxItem icon={<Edit3 size={14} />} label="Rename" onClick={() => { onRename(e); onClose(); }} />
                <CtxItem icon={<Info size={14} />} label="Properties" onClick={() => { onProperties(e); onClose(); }} />

                <CtxDivider />

                {/* Danger */}
                <CtxItem icon={<Trash2 size={14} />} label="Delete" onClick={() => { onDelete(e.path); onClose(); }} danger />
            </div>
        </>
    );
}

// ── Background Context Menu (right-click on empty space) ──────────────────────

interface BgMenuState { x: number; y: number }

interface SelectionRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

function BackgroundContextMenu({
    state, onClose, onNewFolder, onPaste, onSelectAll, onRefresh, canPaste,
}: {
    state: BgMenuState;
    onClose: () => void;
    onNewFolder: () => void;
    onPaste: () => void;
    onSelectAll: () => void;
    onRefresh: () => void;
    canPaste: boolean;
}) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(state.x, vw - 180);
    const top = Math.min(state.y, vh - 180);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 min-w-[180px]"
                style={{ left, top }}
            >
                <CtxItem icon={<FolderPlus size={14} />} label="New Folder" onClick={() => { onNewFolder(); onClose(); }} />
                <CtxItem icon={<Clipboard size={14} />} label="Paste" onClick={() => { onPaste(); onClose(); }} disabled={!canPaste} />
                <CtxDivider />
                <CtxItem icon={<CheckSquare size={14} />} label="Select All" onClick={() => { onSelectAll(); onClose(); }} />
                <CtxItem icon={<RefreshCw size={14} />} label="Refresh" onClick={() => { onRefresh(); onClose(); }} />
            </div>
        </>
    );
}

// ── Properties Modal ───────────────────────────────────────────────────────────

function PropertiesModal({ entry, onClose }: { entry: FileEntry; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <h3 className="text-white text-sm font-semibold">Properties</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                        <FileText size={16} className="text-cyan-400 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-slate-400 text-xs">Name</p>
                            <p className="text-white break-all">{entry.name}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <FolderOpen size={16} className="text-amber-400 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-slate-400 text-xs">Path</p>
                            <p className="text-slate-300 break-all">{entry.path}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Info size={16} className="text-indigo-400" />
                        <div>
                            <p className="text-slate-400 text-xs">Type</p>
                            <p className="text-slate-300 capitalize">{entry.kind}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Download size={16} className="text-emerald-400" />
                        <div>
                            <p className="text-slate-400 text-xs">Size</p>
                            <p className="text-slate-300">{formatSize(entry.size, entry.kind === 'directory')} ({entry.size.toLocaleString()} bytes)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-violet-400" />
                        <div>
                            <p className="text-slate-400 text-xs">Modified</p>
                            <p className="text-slate-300">{entry.modified ? new Date(entry.modified).toLocaleString() : '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Code2 size={16} className="text-sky-400" />
                        <div>
                            <p className="text-slate-400 text-xs">MIME</p>
                            <p className="text-slate-300 break-all">{entry.mime ?? '—'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Mobile Action Sheet ────────────────────────────────────────────────────────

function MobileActionSheet({
    entry,
    onClose,
    onOpen,
    onPreview,
    onDownload,
    onCopy,
    onCut,
    onRename,
    onDelete,
    onProperties,
}: {
    entry: FileEntry;
    onClose: () => void;
    onOpen: (e: FileEntry) => void;
    onPreview: (e: FileEntry) => void;
    onDownload: (path: string) => void;
    onCopy: (e: FileEntry) => void;
    onCut: (e: FileEntry) => void;
    onRename: (e: FileEntry) => void;
    onDelete: (path: string) => void;
    onProperties: (e: FileEntry) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-slate-700 bg-slate-900 p-3 pb-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3" />
                <p className="text-white text-sm font-medium truncate px-1 mb-2">{entry.name}</p>
                <div className="grid grid-cols-4 gap-2">
                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onOpen(entry); onClose(); }}>
                        <FolderOpen size={16} /><span className="text-[11px]">Open</span>
                    </button>
                    {entry.kind === 'file' && (
                        <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onPreview(entry); onClose(); }}>
                            <Eye size={16} /><span className="text-[11px]">Preview</span>
                        </button>
                    )}
                    {entry.kind === 'file' && (
                        <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onDownload(entry.path); onClose(); }}>
                            <Download size={16} /><span className="text-[11px]">Download</span>
                        </button>
                    )}
                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onCopy(entry); onClose(); }}>
                        <Copy size={16} /><span className="text-[11px]">Copy</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onCut(entry); onClose(); }}>
                        <Scissors size={16} /><span className="text-[11px]">Cut</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onRename(entry); onClose(); }}>
                        <Edit3 size={16} /><span className="text-[11px]">Rename</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 text-slate-300" onClick={() => { onProperties(entry); onClose(); }}>
                        <Info size={16} /><span className="text-[11px]">Details</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-500/10 text-red-400" onClick={() => { onDelete(entry.path); onClose(); }}>
                        <Trash2 size={16} /><span className="text-[11px]">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── File Preview Modal ─────────────────────────────────────────────────────────

function FilePreviewModal({ entry, onClose }: { entry: FileEntry; onClose: () => void }) {
    const mime = entry.mime ?? '';
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const isPdf = mime === 'application/pdf';
    const showText = isTextMime(mime);
    const url = previewUrl(entry.path);
    const { data, isLoading, isError } = useFileView(showText ? entry.path : null);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900 flex-shrink-0">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{entry.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {mime || 'unknown type'} · {formatSize(entry.size)}
                        {entry.modified && ` · ${formatDate(entry.modified)}`}
                    </p>
                </div>
                <button
                    onClick={() => downloadFile(entry.path)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                    <Download size={14} />
                    Download
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Close (Escape)"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0 bg-slate-950">
                {isImage && (
                    <img
                        src={url}
                        alt={entry.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                )}
                {isVideo && (
                    <video
                        src={url}
                        controls
                        className="max-w-full max-h-full rounded-lg shadow-2xl"
                    />
                )}
                {isAudio && (
                    <div className="flex flex-col items-center gap-6 text-center">
                        <Music size={80} className="text-pink-400 opacity-50" />
                        <p className="text-white font-medium text-lg">{entry.name}</p>
                        <audio src={url} controls className="w-80" />
                        <p className="text-xs text-slate-600">{formatSize(entry.size)}</p>
                    </div>
                )}
                {isPdf && (
                    <iframe
                        src={url}
                        title={entry.name}
                        className="w-full h-full rounded border border-slate-800"
                    />
                )}
                {showText && (
                    isLoading ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm">Loading…</span>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                            <AlertCircle size={40} className="opacity-60" />
                            <p className="text-sm">Unable to preview this file</p>
                            <button
                                onClick={() => downloadFile(entry.path)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm transition-colors"
                            >
                                <Download size={14} />
                                Download
                            </button>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border border-slate-800">
                            {data?.truncated && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 text-xs border-b border-amber-500/20 flex-shrink-0">
                                    <AlertCircle size={12} />
                                    Showing first 2 MiB — download for full file
                                </div>
                            )}
                            <pre className="flex-1 overflow-auto bg-slate-900 p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                                {data?.content}
                            </pre>
                        </div>
                    )
                )}
                {!isImage && !isVideo && !isAudio && !isPdf && !showText && (
                    <div className="flex flex-col items-center gap-4 text-center text-slate-400">
                        <File size={64} className="opacity-30" />
                        <div>
                            <p className="text-white font-medium">{entry.name}</p>
                            <p className="text-sm mt-1">{formatSize(entry.size)}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{mime || 'unknown type'}</p>
                        </div>
                        <button
                            onClick={() => downloadFile(entry.path)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm transition-colors"
                        >
                            <Download size={14} />
                            Download file
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── File Row (list view) ───────────────────────────────────────────────────────

function FileRow({
    entry, selected, focused, isCut, selectionMode,
    onItemClick, onItemDoubleClick, onContextMenu, onLongPress,
}: {
    entry: FileEntry;
    selected: boolean;
    focused: boolean;
    isCut: boolean;
    selectionMode: boolean;
    onItemClick: (e: React.MouseEvent) => void;
    onItemDoubleClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onLongPress: () => void;
}) {
    const { Icon, color } = getFileIcon(entry);
    const longFiredRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    function handleTouchStart(e: React.TouchEvent) {
        longFiredRef.current = false;
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        timerRef.current = setTimeout(() => {
            longFiredRef.current = true;
            navigator.vibrate?.(30);
            onLongPress();
        }, 500);
    }
    function handleTouchMove(e: React.TouchEvent) {
        if (!startPosRef.current) return;
        const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
        const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) { if (timerRef.current) clearTimeout(timerRef.current); }
    }
    function handleTouchEnd() { if (timerRef.current) clearTimeout(timerRef.current); }
    function handleClick(e: React.MouseEvent) {
        if (longFiredRef.current) { longFiredRef.current = false; return; }
        onItemClick(e);
    }

    return (
        <div
            data-file-item
            data-path={entry.path}
            onClick={handleClick}
            onDoubleClick={onItemDoubleClick}
            onContextMenu={onContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={clsx(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer select-none group transition-all border',
                selected
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-white'
                    : 'hover:bg-slate-800/70 text-slate-300 hover:text-white border-transparent',
                focused && !selected && 'ring-1 ring-cyan-500/60',
                isCut && 'opacity-50',
            )}
        >
            {/* Checkbox (always-width column, visible on hover/selected/selectionMode) */}
            <div className="w-4 flex-shrink-0 flex items-center justify-center">
                <div className={clsx(
                    'transition-opacity',
                    !selectionMode && !selected ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
                )}>
                    {selected
                        ? <CheckSquare size={13} className="text-indigo-400" />
                        : <Square size={13} className="text-slate-500 group-hover:text-slate-300" />
                    }
                </div>
            </div>

            <Icon size={17} className={clsx('flex-shrink-0', color)} />
            <span className="flex-1 text-sm font-medium truncate" title={entry.name}>{entry.name}</span>
            <span className="text-xs text-slate-500 w-28 text-right hidden sm:block">{formatDate(entry.modified)}</span>
            <span className="text-xs text-slate-500 w-20 text-right hidden md:block">
                {formatSize(entry.size, entry.kind === 'directory')}
            </span>
        </div>
    );
}

// ── File Card (grid view) ──────────────────────────────────────────────────────

function FileCard({
    entry, selected, focused, isCut, selectionMode,
    onItemClick, onItemDoubleClick, onContextMenu, onLongPress,
}: {
    entry: FileEntry;
    selected: boolean;
    focused: boolean;
    isCut: boolean;
    selectionMode: boolean;
    onItemClick: (e: React.MouseEvent) => void;
    onItemDoubleClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onLongPress: () => void;
}) {
    const { Icon, color } = getFileIcon(entry);
    const longFiredRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    function handleTouchStart(e: React.TouchEvent) {
        longFiredRef.current = false;
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        timerRef.current = setTimeout(() => {
            longFiredRef.current = true;
            navigator.vibrate?.(30);
            onLongPress();
        }, 500);
    }
    function handleTouchMove(e: React.TouchEvent) {
        if (!startPosRef.current) return;
        const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
        const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) { if (timerRef.current) clearTimeout(timerRef.current); }
    }
    function handleTouchEnd() { if (timerRef.current) clearTimeout(timerRef.current); }
    function handleClick(e: React.MouseEvent) {
        if (longFiredRef.current) { longFiredRef.current = false; return; }
        onItemClick(e);
    }

    return (
        <div
            data-file-item
            data-path={entry.path}
            onClick={handleClick}
            onDoubleClick={onItemDoubleClick}
            onContextMenu={onContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={clsx(
                'relative flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer select-none transition-all group border',
                selected
                    ? 'bg-indigo-500/20 border-indigo-500/30'
                    : 'hover:bg-slate-800/70 border-transparent',
                focused && !selected && 'ring-1 ring-cyan-500/60',
                isCut && 'opacity-50',
            )}
        >
            {/* Checkbox overlay (top-left of icon area) */}
            <div className={clsx(
                'absolute top-1.5 left-1.5 z-10 transition-opacity',
                !selectionMode && !selected ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
            )}>
                {selected
                    ? <CheckSquare size={13} className="text-indigo-400" />
                    : <Square size={13} className="text-slate-500 group-hover:text-slate-300" />
                }
            </div>
            <Icon size={40} className={clsx('transition-transform group-hover:scale-105 flex-shrink-0', color)} />
            <span
                className="text-xs text-center leading-tight line-clamp-2 w-full break-words text-slate-300 group-hover:text-white"
                title={entry.name}
            >
                {entry.name}
            </span>
        </div>
    );
}

// ── Sortable Column Header ─────────────────────────────────────────────────────

function SortableHeader({
    field, label, sortField, sortDir, onSort, className,
}: {
    field: SortField;
    label: string;
    sortField: SortField;
    sortDir: SortDirection;
    onSort: (f: SortField) => void;
    className?: string;
}) {
    const active = sortField === field;
    return (
        <button
            onClick={() => onSort(field)}
            className={clsx(
                'flex items-center gap-1 text-xs font-medium hover:text-white transition-colors',
                active ? 'text-white' : 'text-slate-400',
                className,
            )}
        >
            {label}
            {active
                ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                : <span className="w-3 text-slate-600">↕</span>
            }
        </button>
    );
}

// ── Main Explorer ──────────────────────────────────────────────────────────────

export function FileExplorer() {
    // ── Detect touch device (pointer: coarse) ──────────────────────────────────
    const isTouch = useMemo(
        () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
        [],
    );

    const {
        currentPath, setCurrentPath,
        selectedFiles, toggleSelectFile, clearSelection, selectFiles,
        addNotification,
        viewLayout, setViewLayout,
        showHidden, setShowHidden,
        sortField, sortDir, setSort,
        searchQuery, setSearchQuery,
        previewEntry, setPreviewEntry,
        clipboard, setClipboard,
    } = useAppStore();

    const { data: files, isLoading, isError, error, refetch } = useFileList(currentPath, showHidden);

    const deleteMutation = useDeleteMutation(currentPath);
    const deleteBatchMutation = useDeleteBatchMutation(currentPath);
    const renameMutation = useRenameMutation(currentPath);
    const copyMutation = useCopyMutation(currentPath);
    const mkdirMutation = useMkdirMutation(currentPath);
    const uploadMutation = useUploadMutation(currentPath);

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [bgContextMenu, setBgContextMenu] = useState<BgMenuState | null>(null);
    const [propertiesEntry, setPropertiesEntry] = useState<FileEntry | null>(null);
    const [mobileActionEntry, setMobileActionEntry] = useState<FileEntry | null>(null);
    const [renameEntry, setRenameEntry] = useState<FileEntry | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [showMkdir, setShowMkdir] = useState(false);
    const [mkdirValue, setMkdirValue] = useState('');
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    // Mobile: long-press activates selection mode
    const [selectionMode, setSelectionMode] = useState(false);
    // Keyboard / explorer focus cursor
    const [focusedPath, setFocusedPath] = useState<string | null>(null);
    // Desktop: track last selected path for Shift+Click range select
    const lastSelectedPathRef = useRef<string | null>(null);
    // Cached list used by keyboard shortcuts
    const displayFilesRef = useRef<FileEntry[]>([]);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const cancelRenameRef = useRef(false);
    const [pathJumpMode, setPathJumpMode] = useState(false);
    const [pathJumpValue, setPathJumpValue] = useState(currentPath);
    const pathJumpInputRef = useRef<HTMLInputElement | null>(null);

    // ── Filtered + sorted files ────────────────────────────────────────────────

    const displayFiles = useMemo(() => {
        if (!files) return [];
        let items = [...files];
        const q = searchQuery.trim().toLowerCase();
        if (q) items = items.filter((f) => f.name.toLowerCase().includes(q));

        items.sort((a, b) => {
            // Directories always sort before files
            const da = a.kind === 'directory' ? 0 : 1;
            const db = b.kind === 'directory' ? 0 : 1;
            if (da !== db) return da - db;
            let cmp = 0;
            switch (sortField) {
                case 'name':
                    cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                    break;
                case 'size':
                    cmp = a.size - b.size;
                    break;
                case 'modified': {
                    const at = a.modified ? new Date(a.modified).getTime() : 0;
                    const bt = b.modified ? new Date(b.modified).getTime() : 0;
                    cmp = at - bt;
                    break;
                }
                case 'kind':
                    cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                    break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });
        return items;
    }, [files, searchQuery, sortField, sortDir]);

    // Keep focus valid when list changes.
    useEffect(() => {
        if (displayFiles.length === 0) {
            if (focusedPath !== null) setFocusedPath(null);
            return;
        }
        if (!focusedPath || !displayFiles.some((f) => f.path === focusedPath)) {
            setFocusedPath(displayFiles[0].path);
        }
    }, [displayFiles, focusedPath]);

    useEffect(() => {
        if (!pathJumpMode) {
            setPathJumpValue(currentPath);
        }
    }, [currentPath, pathJumpMode]);

    useEffect(() => {
        if (pathJumpMode) {
            pathJumpInputRef.current?.focus();
            pathJumpInputRef.current?.select();
        }
    }, [pathJumpMode]);

    // Keep ref in sync for keyboard handler (avoids stale closure without re-registering)
    displayFilesRef.current = displayFiles;

    // ── Dropzone ───────────────────────────────────────────────────────────────

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            for (const file of acceptedFiles) {
                setUploadProgress(0);
                try {
                    await uploadMutation.mutateAsync({ file, destPath: currentPath, onProgress: setUploadProgress });
                    addNotification({ type: 'success', message: `Uploaded ${file.name}` });
                } catch (e: any) {
                    addNotification({ type: 'error', message: e.message });
                }
            }
            setUploadProgress(null);
        },
        [currentPath, uploadMutation, addNotification],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

    // ── Navigation ─────────────────────────────────────────────────────────────

    function navigate(entry: FileEntry) {
        if (entry.kind === 'directory') { clearSelection(); setSelectionMode(false); setFocusedPath(null); setCurrentPath(entry.path); }
    }

    function goUp() {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
            clearSelection();
            setSelectionMode(false);
            setFocusedPath(null);
        }
    }

    function openEntry(entry: FileEntry) {
        if (entry.kind === 'directory') { navigate(entry); } else { setPreviewEntry(entry); }
    }

    // ── Touch / click interaction ───────────────────────────────────────────────

    /** Unified click handler — called from FileRow / FileCard / table row */
    function handleItemClick(e: React.MouseEvent, entry: FileEntry) {
        if (isTouch) {
            // Touch: tap = open (or toggle if in selection mode)
            if (selectionMode) {
                toggleSelectFile(entry.path);
                // Exit selection mode when last item deselected
                const willBeSelected = !selectedFiles.has(entry.path);
                if (!willBeSelected && selectedFiles.size === 1) setSelectionMode(false);
            } else {
                openEntry(entry);
            }
            setFocusedPath(entry.path);
            return;
        }
        // Desktop: modifier-aware selection
        if (e.ctrlKey || e.metaKey) {
            toggleSelectFile(entry.path);
            lastSelectedPathRef.current = entry.path;
            setFocusedPath(entry.path);
        } else if (e.shiftKey && lastSelectedPathRef.current) {
            // Range select
            const startIdx = displayFiles.findIndex(f => f.path === lastSelectedPathRef.current);
            const endIdx = displayFiles.findIndex(f => f.path === entry.path);
            if (startIdx >= 0 && endIdx >= 0) {
                const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                selectFiles(displayFiles.slice(lo, hi + 1).map(f => f.path));
            }
            setFocusedPath(entry.path);
        } else {
            selectFiles([entry.path]);
            lastSelectedPathRef.current = entry.path;
            setFocusedPath(entry.path);
        }
    }

    /** Double-click: only fires on desktop (touch uses single-tap via handleItemClick) */
    function handleItemDoubleClick(entry: FileEntry) {
        if (!isTouch) openEntry(entry);
    }

    /** Long-press: only fires on touch — enters selection mode */
    function handleItemLongPress(entry: FileEntry) {
        setSelectionMode(true);
        if (!selectedFiles.has(entry.path)) toggleSelectFile(entry.path);
        lastSelectedPathRef.current = entry.path;
        setFocusedPath(entry.path);
        setMobileActionEntry(entry);
    }

    function handleDragSelectStart(e: React.MouseEvent) {
        if (isTouch || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('[data-file-item]')) return;
        const el = contentRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        dragStartRef.current = {
            x: e.clientX - r.left + el.scrollLeft,
            y: e.clientY - r.top + el.scrollTop,
        };
        setSelectionRect({ left: dragStartRef.current.x, top: dragStartRef.current.y, width: 0, height: 0 });
        clearSelection();
        setSelectionMode(false);
    }

    function handleDragSelectMove(ev: MouseEvent) {
        const start = dragStartRef.current;
        const el = contentRef.current;
        if (!start || !el) return;
        const r = el.getBoundingClientRect();
        const cx = ev.clientX - r.left + el.scrollLeft;
        const cy = ev.clientY - r.top + el.scrollTop;
        const left = Math.min(start.x, cx);
        const top = Math.min(start.y, cy);
        const width = Math.abs(cx - start.x);
        const height = Math.abs(cy - start.y);
        setSelectionRect({ left, top, width, height });
    }

    function handleDragSelectEnd() {
        const box = selectionRect;
        const el = contentRef.current;
        if (!box || !el) {
            dragStartRef.current = null;
            setSelectionRect(null);
            return;
        }
        const rootRect = el.getBoundingClientRect();
        const paths: string[] = [];
        const nodes = el.querySelectorAll<HTMLElement>('[data-file-item][data-path]');
        nodes.forEach((node) => {
            const nr = node.getBoundingClientRect();
            const left = nr.left - rootRect.left + el.scrollLeft;
            const top = nr.top - rootRect.top + el.scrollTop;
            const right = left + nr.width;
            const bottom = top + nr.height;
            const intersects = !(right < box.left || left > box.left + box.width || bottom < box.top || top > box.top + box.height);
            if (intersects) {
                const p = node.dataset.path;
                if (p) paths.push(p);
            }
        });
        selectFiles(paths);
        dragStartRef.current = null;
        setSelectionRect(null);
    }

    // ── Sort ───────────────────────────────────────────────────────────────────

    function handleSort(field: SortField) {
        setSort(field, sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    }

    // ── Context menu ───────────────────────────────────────────────────────────

    function handleContextMenu(e: React.MouseEvent, entry: FileEntry) {
        e.preventDefault();
        setBgContextMenu(null);
        setContextMenu({ x: e.clientX, y: e.clientY, entry });
    }

    function handleBgContextMenu(e: React.MouseEvent) {
        // Only trigger on the content area itself (not on items)
        if ((e.target as HTMLElement).closest('[data-file-item]')) return;
        e.preventDefault();
        setContextMenu(null);
        setBgContextMenu({ x: e.clientX, y: e.clientY });
    }

    function commitPathJump() {
        const raw = pathJumpValue.trim();
        if (!raw) {
            setPathJumpMode(false);
            return;
        }
        const normalized = raw.startsWith('/') ? raw : `/${raw}`;
        clearSelection();
        setFocusedPath(null);
        setCurrentPath(normalized);
        setPathJumpMode(false);
    }

    // ── Clipboard operations ───────────────────────────────────────────────────

    function handleCut(entry: FileEntry) {
        const paths = selectedFiles.size > 1 && selectedFiles.has(entry.path)
            ? [...selectedFiles]
            : [entry.path];
        setClipboard({ operation: 'cut', paths });
        addNotification({ type: 'info', message: `${paths.length} item${paths.length !== 1 ? 's' : ''} cut` });
    }

    function handleCopyToClipboard(entry: FileEntry) {
        const paths = selectedFiles.size > 1 && selectedFiles.has(entry.path)
            ? [...selectedFiles]
            : [entry.path];
        setClipboard({ operation: 'copy', paths });
        addNotification({ type: 'info', message: `${paths.length} item${paths.length !== 1 ? 's' : ''} copied` });
    }

    async function handlePaste() {
        if (!clipboard) return;
        const { operation, paths } = clipboard;
        let ok = 0; let fail = 0;
        for (const srcPath of paths) {
            const name = srcPath.split('/').pop() ?? 'file';
            const destPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
            try {
                if (operation === 'cut') {
                    await renameMutation.mutateAsync({ from: srcPath, to: destPath });
                } else {
                    await copyMutation.mutateAsync({ from: srcPath, to: destPath });
                }
                ok++;
            } catch { fail++; }
        }
        if (operation === 'cut') setClipboard(null);
        addNotification({
            type: fail > 0 ? 'warning' : 'success',
            message: `${ok} pasted${fail > 0 ? `, ${fail} failed` : ''}`,
        });
    }

    async function handleDuplicateSelected(explicitPaths?: string[]) {
        const paths = explicitPaths ?? [...selectedFiles];
        if (paths.length === 0) return;

        const existingNames = new Set(displayFiles.map((f) => f.name.toLowerCase()));
        let ok = 0;
        let fail = 0;

        for (const srcPath of paths) {
            const fileName = srcPath.split('/').pop() ?? 'copy';
            const dotIndex = fileName.lastIndexOf('.');
            const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';
            const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;

            let candidate = `${base}_copy${ext}`;
            let i = 2;
            while (existingNames.has(candidate.toLowerCase())) {
                candidate = `${base}_copy${i}${ext}`;
                i += 1;
            }
            existingNames.add(candidate.toLowerCase());
            const destPath = currentPath === '/' ? `/${candidate}` : `${currentPath}/${candidate}`;

            try {
                await copyMutation.mutateAsync({ from: srcPath, to: destPath });
                ok += 1;
            } catch {
                fail += 1;
            }
        }

        addNotification({
            type: fail > 0 ? 'warning' : 'success',
            message: `${ok} duplicated${fail > 0 ? `, ${fail} failed` : ''}`,
        });
    }

    function moveFocusAndSelection(
        dFiles: FileEntry[],
        nextIndex: number,
        currentIndex: number,
        currentFocusedPath: string | null,
        withRange: boolean,
    ) {
        const clampedIndex = Math.max(0, Math.min(dFiles.length - 1, nextIndex));
        const nextPath = dFiles[clampedIndex].path;
        setFocusedPath(nextPath);

        if (withRange) {
            const anchorPath = lastSelectedPathRef.current ?? currentFocusedPath ?? dFiles[currentIndex].path;
            const anchorIndex = dFiles.findIndex((f) => f.path === anchorPath);
            if (anchorIndex >= 0) {
                const [lo, hi] = anchorIndex < clampedIndex ? [anchorIndex, clampedIndex] : [clampedIndex, anchorIndex];
                selectFiles(dFiles.slice(lo, hi + 1).map((f) => f.path));
            }
        } else {
            selectFiles([nextPath]);
            lastSelectedPathRef.current = nextPath;
        }
    }

    useEffect(() => {
        if (!focusedPath || !contentRef.current) return;
        const node = contentRef.current.querySelector<HTMLElement>(`[data-file-item][data-path="${CSS.escape(focusedPath)}"]`);
        if (node) {
            node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [focusedPath]);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────

    // Use refs so the keydown handler reads fresh state without re-registering.
    const stateRef = useRef<{
        selectedFiles: Set<string>;
        displayFiles: FileEntry[];
        clipboard: { operation: 'copy' | 'cut'; paths: string[] } | null;
        currentPath: string;
        focusedPath: string | null;
        viewLayout: ViewLayout;
    }>({
        selectedFiles: new Set(),
        displayFiles: [],
        clipboard: null,
        currentPath: '/',
        focusedPath: null,
        viewLayout: 'list',
    });

    useEffect(() => {
        stateRef.current = {
            selectedFiles,
            displayFiles: displayFilesRef.current,
            clipboard,
            currentPath,
            focusedPath,
            viewLayout,
        };
    }, [selectedFiles, clipboard, currentPath, focusedPath, viewLayout]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement).tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

            const { selectedFiles: sel, displayFiles: dFiles, clipboard: cb, focusedPath: fp, viewLayout: vl } = stateRef.current;

            if (e.key === 'Escape') {
                clearSelection(); setSelectionMode(false); setFocusedPath(null); setContextMenu(null); setBgContextMenu(null);
                return;
            }
            if (e.key === 'Enter') {
                if (e.altKey) {
                    const entry = fp
                        ? dFiles.find((f) => f.path === fp)
                        : sel.size === 1
                            ? dFiles.find((f) => sel.has(f.path))
                            : null;
                    if (entry) {
                        e.preventDefault();
                        setPropertiesEntry(entry);
                    }
                    return;
                }
                if (fp || sel.size === 1) {
                    const entry = fp
                        ? dFiles.find((f) => f.path === fp)
                        : dFiles.find((f) => sel.has(f.path));
                    if (entry) openEntry(entry);
                }
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                const entry = fp
                    ? dFiles.find((f) => f.path === fp)
                    : sel.size === 1
                        ? dFiles.find((f) => sel.has(f.path))
                        : null;
                if (entry) startRename(entry);
                return;
            }
            if (e.key === 'Delete') {
                if (sel.size > 0) handleDeleteSelected([...sel], e.shiftKey);
                return;
            }
            if (e.key === 'F5') {
                e.preventDefault();
                void refetch();
                return;
            }
            if (e.key === 'Backspace' && sel.size === 0) {
                goUp();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                setPathJumpMode(true);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                selectFiles(dFiles.map(f => f.path));
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                if (sel.size > 0) {
                    void handleDuplicateSelected([...sel]);
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setShowMkdir(true);
                setMkdirValue('');
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (sel.size > 0) {
                    setClipboard({ operation: 'copy', paths: [...sel] });
                    addNotification({ type: 'info', message: `${sel.size} item${sel.size !== 1 ? 's' : ''} copied` });
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
                if (sel.size > 0) {
                    setClipboard({ operation: 'cut', paths: [...sel] });
                    addNotification({ type: 'info', message: `${sel.size} item${sel.size !== 1 ? 's' : ''} cut` });
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                if (cb) handlePaste();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                if (!fp) return;
                toggleSelectFile(fp);
                if (!lastSelectedPathRef.current) lastSelectedPathRef.current = fp;
                return;
            }

            if (e.key === 'Home' || e.key === 'End') {
                if (dFiles.length === 0) return;
                e.preventDefault();
                const nextIndex = e.key === 'Home' ? 0 : dFiles.length - 1;
                const currentIndex = fp
                    ? dFiles.findIndex((f) => f.path === fp)
                    : sel.size > 0
                        ? dFiles.findIndex((f) => sel.has(f.path))
                        : 0;
                const idx = currentIndex >= 0 ? currentIndex : 0;
                moveFocusAndSelection(dFiles, nextIndex, idx, fp, e.shiftKey);
                return;
            }

            if (e.key === 'PageUp' || e.key === 'PageDown') {
                if (dFiles.length === 0) return;
                e.preventDefault();
                const currentIndex = fp
                    ? dFiles.findIndex((f) => f.path === fp)
                    : sel.size > 0
                        ? dFiles.findIndex((f) => sel.has(f.path))
                        : 0;
                const idx = currentIndex >= 0 ? currentIndex : 0;
                const pageStep = vl === 'grid' ? 12 : 10;
                const delta = e.key === 'PageDown' ? pageStep : -pageStep;
                const nextIndex = Math.max(0, Math.min(dFiles.length - 1, idx + delta));
                moveFocusAndSelection(dFiles, nextIndex, idx, fp, e.shiftKey);
                return;
            }

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (dFiles.length === 0) return;
                e.preventDefault();

                const currentIndex = fp
                    ? dFiles.findIndex((f) => f.path === fp)
                    : sel.size > 0
                        ? dFiles.findIndex((f) => sel.has(f.path))
                        : 0;
                const idx = currentIndex >= 0 ? currentIndex : 0;

                let nextIndex = idx;
                if (vl === 'grid') {
                    const firstItem = contentRef.current?.querySelector<HTMLElement>('[data-file-item][data-path]');
                    const containerWidth = contentRef.current?.clientWidth ?? 1;
                    const itemWidth = Math.max(1, firstItem?.getBoundingClientRect().width ?? 96);
                    const cols = Math.max(1, Math.floor(containerWidth / itemWidth));
                    if (e.key === 'ArrowLeft') nextIndex = idx - 1;
                    if (e.key === 'ArrowRight') nextIndex = idx + 1;
                    if (e.key === 'ArrowUp') nextIndex = idx - cols;
                    if (e.key === 'ArrowDown') nextIndex = idx + cols;
                } else {
                    if (e.key === 'ArrowUp') nextIndex = idx - 1;
                    if (e.key === 'ArrowDown') nextIndex = idx + 1;
                    if (e.key === 'ArrowLeft') nextIndex = idx - 1;
                    if (e.key === 'ArrowRight') nextIndex = idx + 1;
                }

                moveFocusAndSelection(dFiles, nextIndex, idx, fp, e.shiftKey);
                return;
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        function onMove(ev: MouseEvent) { handleDragSelectMove(ev); }
        function onUp() { handleDragSelectEnd(); }
        if (dragStartRef.current) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            return () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
        }
        return;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectionRect]);

    // ── Cut-items set (for visual fading) ──────────────────────────────────────

    const cutPaths = useMemo(
        () => clipboard?.operation === 'cut' ? new Set(clipboard.paths) : new Set<string>(),
        [clipboard],
    );

    async function handleDelete(path: string, hardDelete = false) {
        const name = path.split('/').pop();
        const msg = hardDelete
            ? `Permanently delete "${name}"? This cannot be undone.`
            : `Delete "${name}"?`;
        if (!confirm(msg)) return;
        try {
            await deleteMutation.mutateAsync(path);
            addNotification({
                type: 'success',
                message: hardDelete ? 'Permanently deleted' : 'Deleted successfully',
            });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
    }

    async function handleDeleteSelected(explicitPaths?: string[], hardDelete = false) {
        const paths = explicitPaths ?? Array.from(selectedFiles);
        if (paths.length === 0) return;
        const msg = hardDelete
            ? `Permanently delete ${paths.length} selected item${paths.length > 1 ? 's' : ''}? This cannot be undone.`
            : `Delete ${paths.length} selected item${paths.length > 1 ? 's' : ''}?`;
        if (!confirm(msg)) return;
        try {
            const { data } = await deleteBatchMutation.mutateAsync(paths);
            clearSelection();
            setSelectionMode(false);
            setFocusedPath(null);
            addNotification({
                type: data.errors?.length ? 'warning' : 'success',
                message: `Deleted ${data.deleted} item${data.deleted !== 1 ? 's' : ''}${data.errors?.length ? ` (${data.errors.length} error(s))` : ''}`,
            });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
    }

    function startRename(entry: FileEntry) { setRenameEntry(entry); setRenameValue(entry.name); }

    async function handleCopy(entry: FileEntry) {
        const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop() : '';
        const base = ext ? entry.name.slice(0, entry.name.lastIndexOf('.')) : entry.name;
        const destName = `${base}_copy${ext}`;
        const destPath = currentPath === '/' ? `/${destName}` : `${currentPath}/${destName}`;
        try {
            await copyMutation.mutateAsync({ from: entry.path, to: destPath });
            addNotification({ type: 'success', message: `Copied as "${destName}"` });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
    }

    async function commitRename() {
        if (!renameEntry) { return; }
        if (cancelRenameRef.current) {
            cancelRenameRef.current = false;
            setRenameEntry(null);
            return;
        }
        const trimmed = renameValue.trim();
        if (!trimmed || trimmed === renameEntry.name) { setRenameEntry(null); return; }
        const parts = renameEntry.path.split('/');
        parts[parts.length - 1] = trimmed;
        const newPath = parts.join('/');
        try {
            await renameMutation.mutateAsync({ from: renameEntry.path, to: newPath });
            addNotification({ type: 'success', message: 'Renamed successfully' });
            setFocusedPath(newPath);
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
        setRenameEntry(null);
    }

    async function commitMkdir() {
        if (!mkdirValue.trim()) { setShowMkdir(false); return; }
        const newPath = currentPath === '/' ? `/${mkdirValue.trim()}` : `${currentPath}/${mkdirValue.trim()}`;
        try {
            await mkdirMutation.mutateAsync(newPath);
            addNotification({ type: 'success', message: 'Folder created' });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
        setShowMkdir(false);
        setMkdirValue('');
    }

    // ── Rename inline helpers ──────────────────────────────────────────────────

    function renderRenameRow(entry: FileEntry, compact = false) {
        const { Icon, color } = getFileIcon(entry);
        return (
            <div className={clsx(
                'flex items-center gap-3 px-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30',
                compact ? 'py-2' : 'py-2.5',
            )}>
                <Icon size={compact ? 16 : 18} className={clsx('flex-shrink-0', color)} />
                <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') {
                            cancelRenameRef.current = true;
                            setRenameEntry(null);
                        }
                    }}
                    onBlur={commitRename}
                    className="flex-1 bg-transparent text-white text-sm outline-none"
                />
            </div>
        );
    }

    function renderGridRenameCard(entry: FileEntry) {
        const { Icon, color } = getFileIcon(entry);
        return (
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <Icon size={40} className={color} />
                <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') {
                            cancelRenameRef.current = true;
                            setRenameEntry(null);
                        }
                    }}
                    onBlur={commitRename}
                    className="w-full bg-slate-800 text-white text-xs rounded px-1 py-0.5 outline-none text-center"
                />
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            <div
                {...getRootProps()}
                className={clsx(
                    'flex flex-col flex-1 min-h-0 relative transition-all',
                    isDragActive && 'ring-2 ring-cyan-500/50 ring-inset bg-cyan-500/5',
                )}
            >
                <input {...getInputProps()} />

                {/* ── Toolbar ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex-shrink-0 flex-wrap gap-y-1.5">
                    <button
                        onClick={goUp}
                        disabled={currentPath === '/'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Go up"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    {pathJumpMode ? (
                        <div className="flex items-center min-w-[220px] max-w-[520px] flex-1 sm:flex-none">
                            <input
                                ref={pathJumpInputRef}
                                value={pathJumpValue}
                                onChange={(e) => setPathJumpValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitPathJump();
                                    if (e.key === 'Escape') setPathJumpMode(false);
                                }}
                                onBlur={() => setPathJumpMode(false)}
                                placeholder="/path"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0">
                            <Breadcrumb
                                path={currentPath}
                                onNavigate={(p) => { clearSelection(); setFocusedPath(null); setCurrentPath(p); }}
                            />
                            <button
                                onClick={() => setPathJumpMode(true)}
                                className="hidden sm:inline-flex text-[11px] text-slate-500 hover:text-slate-300"
                                title="Quick path jump (Ctrl/Cmd+L)"
                            >
                                Ctrl/Cmd+L
                            </button>
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative hidden sm:flex items-center">
                        <Search size={13} className="absolute left-2.5 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-36 pl-8 pr-6 py-1.5 bg-slate-800 text-white text-xs rounded-lg border border-slate-700 focus:border-indigo-500/70 outline-none placeholder-slate-600 focus:w-48 transition-all duration-200"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Hidden files toggle */}
                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className={clsx(
                            'p-1.5 rounded-lg transition-all',
                            showHidden
                                ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800',
                        )}
                        title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
                    >
                        {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Layout switcher */}
                    <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                        {LAYOUTS.map(({ mode, Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewLayout(mode)}
                                title={label}
                                className={clsx(
                                    'p-1.5 transition-all',
                                    viewLayout === mode
                                        ? 'bg-slate-700 text-white'
                                        : 'text-slate-500 hover:text-white hover:bg-slate-800/70',
                                )}
                            >
                                <Icon size={14} />
                            </button>
                        ))}
                    </div>

                    {/* Sort dropdown (list + grid — table uses column headers) */}
                    {viewLayout !== 'table' && (
                        <select
                            value={`${sortField}-${sortDir}`}
                            onChange={(e) => {
                                const [f, d] = e.target.value.split('-');
                                setSort(f as SortField, d as SortDirection);
                            }}
                            className="hidden sm:block bg-slate-800 text-slate-400 text-xs rounded-lg px-2 py-1.5 border border-slate-700 hover:border-slate-600 cursor-pointer outline-none"
                        >
                            <option value="name-asc">Name A→Z</option>
                            <option value="name-desc">Name Z→A</option>
                            <option value="size-asc">Size ↑</option>
                            <option value="size-desc">Size ↓</option>
                            <option value="modified-desc">Newest</option>
                            <option value="modified-asc">Oldest</option>
                        </select>
                    )}

                    {/* Selection actions */}
                    {selectedFiles.size > 0 && (
                        <>
                            <button
                                onClick={() => setClipboard({ operation: 'copy', paths: [...selectedFiles] })}
                                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all"
                                title="Copy selected (Ctrl/Cmd+C)"
                            >
                                <Copy size={14} />
                                <span>Copy</span>
                            </button>
                            <button
                                onClick={() => setClipboard({ operation: 'cut', paths: [...selectedFiles] })}
                                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all"
                                title="Cut selected (Ctrl/Cmd+X)"
                            >
                                <Scissors size={14} />
                                <span>Cut</span>
                            </button>
                            <button
                                onClick={() => { void handleDeleteSelected(); }}
                                disabled={deleteBatchMutation.isPending}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-medium transition-all disabled:opacity-50"
                                title="Delete selected (Del)"
                            >
                                <Trash2 size={14} />
                                <span>Delete {selectedFiles.size}</span>
                            </button>
                        </>
                    )}

                    {/* Paste */}
                    <button
                        onClick={handlePaste}
                        disabled={!clipboard}
                        className={clsx(
                            'p-1.5 rounded-lg transition-all',
                            clipboard
                                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                : 'text-slate-600 cursor-not-allowed',
                        )}
                        title={clipboard ? 'Paste (Ctrl/Cmd+V)' : 'Clipboard empty'}
                    >
                        <Clipboard size={16} />
                    </button>

                    {/* Select all */}
                    <button
                        onClick={() => selectFiles(displayFiles.map((f) => f.path))}
                        className="hidden sm:block p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title="Select all (Ctrl/Cmd+A)"
                    >
                        <CheckSquare size={16} />
                    </button>

                    {/* New folder */}
                    <button
                        onClick={() => { setShowMkdir(true); setMkdirValue(''); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title="New folder"
                    >
                        <FolderPlus size={16} />
                    </button>

                    {/* Upload */}
                    <label
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                        title="Upload files"
                    >
                        <Upload size={16} />
                        <input
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={async (e) => {
                                for (const f of Array.from(e.target.files ?? [])) {
                                    setUploadProgress(0);
                                    try {
                                        await uploadMutation.mutateAsync({ file: f, destPath: currentPath, onProgress: setUploadProgress });
                                        addNotification({ type: 'success', message: `Uploaded ${f.name}` });
                                    } catch (err: any) {
                                        addNotification({ type: 'error', message: err.message });
                                    }
                                }
                                setUploadProgress(null);
                            }}
                        />
                    </label>

                    {/* Refresh */}
                    <button
                        onClick={() => refetch()}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Upload progress bar */}
                {uploadProgress !== null && (
                    <div className="h-1 bg-slate-800 flex-shrink-0">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                )}

                {/* New folder input */}
                {showMkdir && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/30 flex-shrink-0">
                        <Folder size={16} className="text-amber-400 flex-shrink-0" />
                        <input
                            autoFocus
                            value={mkdirValue}
                            onChange={(e) => setMkdirValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitMkdir();
                                if (e.key === 'Escape') setShowMkdir(false);
                            }}
                            onBlur={commitMkdir}
                            placeholder="New folder name"
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500"
                        />
                    </div>
                )}

                {/* Table column headers */}
                {viewLayout === 'table' && (
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800/80 bg-slate-900/30 flex-shrink-0 select-none">
                        <div className="w-4 flex-shrink-0 text-slate-600">
                            <MousePointer2 size={12} />
                        </div>
                        <SortableHeader field="name" label="Name" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="flex-1" />
                        <SortableHeader field="kind" label="Type" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-20 hidden sm:flex" />
                        <SortableHeader field="modified" label="Modified" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-28 hidden md:flex justify-end" />
                        <SortableHeader field="size" label="Size" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-20 hidden md:flex justify-end" />
                    </div>
                )}

                {/* Mobile selection action strip */}
                {isTouch && selectionMode && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex-shrink-0">
                        <span className="text-xs text-slate-300 flex-1">{selectedFiles.size} selected</span>
                        <button
                            onClick={() => setClipboard({ operation: 'copy', paths: [...selectedFiles] })}
                            disabled={selectedFiles.size === 0}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
                            title="Copy"
                        >
                            <Copy size={14} />
                        </button>
                        <button
                            onClick={() => setClipboard({ operation: 'cut', paths: [...selectedFiles] })}
                            disabled={selectedFiles.size === 0}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
                            title="Cut"
                        >
                            <Scissors size={14} />
                        </button>
                        <button
                            onClick={() => { void handleDeleteSelected(); }}
                            disabled={selectedFiles.size === 0 || deleteBatchMutation.isPending}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                        <button
                            onClick={() => { clearSelection(); setSelectionMode(false); }}
                            className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            title="Done"
                        >
                            <Check size={14} />
                        </button>
                    </div>
                )}

                {/* File content area */}
                <div
                    ref={contentRef}
                    className={clsx('relative flex-1 overflow-y-auto min-h-0', viewLayout === 'grid' ? 'p-3' : 'p-2')}
                    onMouseDown={handleDragSelectStart}
                    onContextMenu={handleBgContextMenu}
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest('[data-file-item]')) return;
                        if (!isTouch) { clearSelection(); setSelectionMode(false); setFocusedPath(null); }
                        setContextMenu(null);
                        setBgContextMenu(null);
                    }}
                >
                    {isLoading && (
                        <div className="flex items-center justify-center h-32 text-slate-500">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    )}

                    {isError && (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-red-400">
                            <AlertCircle size={24} />
                            <p className="text-sm">{(error as Error).message}</p>
                        </div>
                    )}

                    {!isLoading && !isError && displayFiles.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500">
                            {searchQuery ? (
                                <>
                                    <Search size={28} className="opacity-40" />
                                    <p className="text-sm">No results for "{searchQuery}"</p>
                                    <button onClick={() => setSearchQuery('')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                        Clear search
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Folder size={32} className="opacity-40" />
                                    <p className="text-sm">Empty folder</p>
                                    <p className="text-xs">Drop files here to upload</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Grid view */}
                    {viewLayout === 'grid' && !isLoading && !isError && displayFiles.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1">
                            {displayFiles.map((entry) => (
                                <div key={entry.path}>
                                    {renameEntry?.path === entry.path
                                        ? renderGridRenameCard(entry)
                                        : (
                                            <FileCard
                                                entry={entry}
                                                selected={selectedFiles.has(entry.path)}
                                                focused={focusedPath === entry.path}
                                                isCut={cutPaths.has(entry.path)}
                                                selectionMode={selectionMode}
                                                onItemClick={(e) => handleItemClick(e, entry)}
                                                onItemDoubleClick={() => handleItemDoubleClick(entry)}
                                                onContextMenu={(e) => handleContextMenu(e, entry)}
                                                onLongPress={() => handleItemLongPress(entry)}
                                            />
                                        )
                                    }
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List view */}
                    {viewLayout === 'list' && !isLoading && !isError && displayFiles.length > 0 && (
                        <div>
                            {displayFiles.map((entry) => (
                                <div key={entry.path}>
                                    {renameEntry?.path === entry.path
                                        ? renderRenameRow(entry)
                                        : (
                                            <FileRow
                                                entry={entry}
                                                selected={selectedFiles.has(entry.path)}
                                                focused={focusedPath === entry.path}
                                                isCut={cutPaths.has(entry.path)}
                                                selectionMode={selectionMode}
                                                onItemClick={(e) => handleItemClick(e, entry)}
                                                onItemDoubleClick={() => handleItemDoubleClick(entry)}
                                                onContextMenu={(e) => handleContextMenu(e, entry)}
                                                onLongPress={() => handleItemLongPress(entry)}
                                            />
                                        )
                                    }
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Table view */}
                    {viewLayout === 'table' && !isLoading && !isError && displayFiles.length > 0 && (
                        <div>
                            {displayFiles.map((entry) => {
                                if (renameEntry?.path === entry.path) {
                                    return <div key={entry.path}>{renderRenameRow(entry, true)}</div>;
                                }
                                const { Icon, color } = getFileIcon(entry);
                                return (
                                    <div
                                        data-file-item
                                        data-path={entry.path}
                                        key={entry.path}
                                        onDoubleClick={() => handleItemDoubleClick(entry)}
                                        onClick={(e) => handleItemClick(e, entry)}
                                        onContextMenu={(e) => handleContextMenu(e, entry)}
                                        className={clsx(
                                            'flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer select-none group transition-all border',
                                            selectedFiles.has(entry.path)
                                                ? 'bg-indigo-500/20 border-indigo-500/30'
                                                : 'hover:bg-slate-800/50 border-transparent',
                                            focusedPath === entry.path && !selectedFiles.has(entry.path) && 'ring-1 ring-cyan-500/60',
                                            cutPaths.has(entry.path) && 'opacity-50',
                                        )}
                                    >
                                        <div className="w-4 flex-shrink-0 flex items-center justify-center">
                                            {selectedFiles.has(entry.path)
                                                ? <CheckSquare size={13} className="text-indigo-400" />
                                                : <Square size={13} className="text-slate-500 group-hover:text-slate-300" />}
                                        </div>
                                        <Icon size={16} className={clsx('flex-shrink-0', color)} />
                                        <span className="flex-1 text-sm text-slate-300 group-hover:text-white truncate" title={entry.name}>{entry.name}</span>
                                        <span className="text-xs text-slate-600 w-20 hidden sm:block capitalize">{entry.kind}</span>
                                        <span className="text-xs text-slate-500 w-28 text-right hidden md:block">{formatDate(entry.modified)}</span>
                                        <span className="text-xs text-slate-500 w-20 text-right hidden md:block">{formatSize(entry.size, entry.kind === 'directory')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Status hint strip */}
                    {!isLoading && !isError && (
                        <div className="mt-2 px-2 text-[11px] text-slate-600 flex items-center gap-2 select-none">
                            <Info size={12} className="flex-shrink-0" />
                            {isTouch
                                ? 'Tap to open. Long-press to multi-select. Use toolbar/context menu for actions.'
                                : 'Single click selects. Double click opens. Right click for menu. Arrow/Home/End/Page keys, F5 refresh, Ctrl/Cmd + A/C/X/V/D/L/Space, Shift+Delete, F2, Alt+Enter supported.'}
                        </div>
                    )}

                    {!isTouch && selectionRect && (
                        <div
                            className="absolute border border-cyan-400/70 bg-cyan-500/15 pointer-events-none z-30"
                            style={{
                                left: selectionRect.left,
                                top: selectionRect.top,
                                width: selectionRect.width,
                                height: selectionRect.height,
                            }}
                        />
                    )}
                </div>

                {/* Drag overlay */}
                {isDragActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 pointer-events-none">
                        <div className="flex flex-col items-center gap-3 text-cyan-400">
                            <Upload size={40} />
                            <p className="text-lg font-semibold">Drop to upload</p>
                        </div>
                    </div>
                )}

                {/* Context Menu */}
                {contextMenu && (
                    <ContextMenu
                        state={contextMenu}
                        onClose={() => setContextMenu(null)}
                        onOpen={openEntry}
                        onPreview={setPreviewEntry}
                        onDelete={handleDelete}
                        onRename={startRename}
                        onDownload={downloadFile}
                        onCut={handleCut}
                        onCopy={handleCopyToClipboard}
                        onPaste={handlePaste}
                        onProperties={setPropertiesEntry}
                        canPaste={Boolean(clipboard)}
                    />
                )}

                {/* Background context menu */}
                {bgContextMenu && (
                    <BackgroundContextMenu
                        state={bgContextMenu}
                        onClose={() => setBgContextMenu(null)}
                        onNewFolder={() => { setShowMkdir(true); setMkdirValue(''); }}
                        onPaste={handlePaste}
                        onSelectAll={() => selectFiles(displayFiles.map((f) => f.path))}
                        onRefresh={() => refetch()}
                        canPaste={Boolean(clipboard)}
                    />
                )}
            </div>

            {/* File Preview Modal — rendered outside the dropzone div to cover full screen */}
            {previewEntry && (
                <FilePreviewModal entry={previewEntry} onClose={() => setPreviewEntry(null)} />
            )}

            {mobileActionEntry && isTouch && (
                <MobileActionSheet
                    entry={mobileActionEntry}
                    onClose={() => setMobileActionEntry(null)}
                    onOpen={openEntry}
                    onPreview={setPreviewEntry}
                    onDownload={downloadFile}
                    onCopy={handleCopyToClipboard}
                    onCut={handleCut}
                    onRename={startRename}
                    onDelete={handleDelete}
                    onProperties={setPropertiesEntry}
                />
            )}

            {propertiesEntry && (
                <PropertiesModal entry={propertiesEntry} onClose={() => setPropertiesEntry(null)} />
            )}
        </>
    );
}
