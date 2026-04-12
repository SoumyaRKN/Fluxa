import { useState, useCallback, useMemo } from 'react';
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

function ContextMenu({
    state, onClose, onPreview, onDelete, onRename, onDownload, onCopy,
}: {
    state: ContextMenuState;
    onClose: () => void;
    onPreview: (entry: FileEntry) => void;
    onDelete: (path: string) => void;
    onRename: (entry: FileEntry) => void;
    onDownload: (path: string) => void;
    onCopy: (entry: FileEntry) => void;
}) {
    const items = [
        state.entry.kind === 'file' && {
            label: 'Open / Preview',
            icon: <Eye size={14} />,
            onClick: () => { onPreview(state.entry); onClose(); },
        },
        state.entry.kind === 'file' && {
            label: 'Download',
            icon: <Download size={14} />,
            onClick: () => { onDownload(state.entry.path); onClose(); },
        },
        {
            label: 'Copy here',
            icon: <Copy size={14} />,
            onClick: () => { onCopy(state.entry); onClose(); },
        },
        {
            label: 'Rename',
            icon: <Edit3 size={14} />,
            onClick: () => { onRename(state.entry); onClose(); },
        },
        {
            label: 'Delete',
            icon: <Trash2 size={14} />,
            onClick: () => { onDelete(state.entry.path); onClose(); },
            danger: true,
        },
    ].filter(Boolean) as { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[160px]"
                style={{ left: state.x, top: state.y }}
            >
                {items.map((item) => (
                    <button
                        key={item.label}
                        onClick={item.onClick}
                        className={clsx(
                            'flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left hover:bg-slate-700 transition-colors',
                            item.danger ? 'text-red-400 hover:text-red-300' : 'text-slate-300 hover:text-white',
                        )}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </div>
        </>
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
    entry, selected, onSelect, onOpen, onContextMenu
}: {
    entry: FileEntry;
    selected: boolean;
    onSelect: (path: string) => void;
    onOpen: (entry: FileEntry) => void;
    onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
    const { Icon, color } = getFileIcon(entry);
    return (
        <div
            onDoubleClick={() => onOpen(entry)}
            onClick={() => onSelect(entry.path)}
            onContextMenu={(e) => onContextMenu(e, entry)}
            className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer select-none group transition-all',
                selected
                    ? 'bg-indigo-500/20 border border-indigo-500/30 text-white'
                    : 'hover:bg-slate-800/70 text-slate-300 hover:text-white border border-transparent',
            )}
        >
            <Icon size={18} className={clsx('flex-shrink-0', color)} />
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
    entry, selected, onSelect, onOpen, onContextMenu
}: {
    entry: FileEntry;
    selected: boolean;
    onSelect: (path: string) => void;
    onOpen: (entry: FileEntry) => void;
    onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
    const { Icon, color } = getFileIcon(entry);
    return (
        <div
            onDoubleClick={() => onOpen(entry)}
            onClick={() => onSelect(entry.path)}
            onContextMenu={(e) => onContextMenu(e, entry)}
            className={clsx(
                'flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer select-none transition-all group',
                selected
                    ? 'bg-indigo-500/20 border border-indigo-500/30'
                    : 'hover:bg-slate-800/70 border border-transparent',
            )}
        >
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
    const {
        currentPath, setCurrentPath,
        selectedFiles, toggleSelectFile, clearSelection,
        addNotification,
        viewLayout, setViewLayout,
        showHidden, setShowHidden,
        sortField, sortDir, setSort,
        searchQuery, setSearchQuery,
        previewEntry, setPreviewEntry,
    } = useAppStore();

    const { data: files, isLoading, isError, error, refetch } = useFileList(currentPath, showHidden);

    const deleteMutation = useDeleteMutation(currentPath);
    const deleteBatchMutation = useDeleteBatchMutation(currentPath);
    const renameMutation = useRenameMutation(currentPath);
    const copyMutation = useCopyMutation(currentPath);
    const mkdirMutation = useMkdirMutation(currentPath);
    const uploadMutation = useUploadMutation(currentPath);

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [renameEntry, setRenameEntry] = useState<FileEntry | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [showMkdir, setShowMkdir] = useState(false);
    const [mkdirValue, setMkdirValue] = useState('');
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
        if (entry.kind === 'directory') { clearSelection(); setCurrentPath(entry.path); }
    }

    function goUp() {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
            clearSelection();
        }
    }

    function openEntry(entry: FileEntry) {
        if (entry.kind === 'directory') { navigate(entry); } else { setPreviewEntry(entry); }
    }

    // ── Sort ───────────────────────────────────────────────────────────────────

    function handleSort(field: SortField) {
        setSort(field, sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    }

    // ── Context menu & actions ─────────────────────────────────────────────────

    function handleContextMenu(e: React.MouseEvent, entry: FileEntry) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, entry });
    }

    async function handleDelete(path: string) {
        if (!confirm(`Delete "${path.split('/').pop()}"?`)) return;
        try {
            await deleteMutation.mutateAsync(path);
            addNotification({ type: 'success', message: 'Deleted successfully' });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
    }

    async function handleDeleteSelected() {
        const paths = Array.from(selectedFiles);
        if (paths.length === 0) return;
        if (!confirm(`Delete ${paths.length} selected item${paths.length > 1 ? 's' : ''}?`)) return;
        try {
            const { data } = await deleteBatchMutation.mutateAsync(paths);
            clearSelection();
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
        if (!renameEntry || renameValue.trim() === renameEntry.name) { setRenameEntry(null); return; }
        const parts = renameEntry.path.split('/');
        parts[parts.length - 1] = renameValue.trim();
        const newPath = parts.join('/');
        try {
            await renameMutation.mutateAsync({ from: renameEntry.path, to: newPath });
            addNotification({ type: 'success', message: 'Renamed successfully' });
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
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameEntry(null); }}
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
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameEntry(null); }}
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

                    <Breadcrumb
                        path={currentPath}
                        onNavigate={(p) => { clearSelection(); setCurrentPath(p); }}
                    />

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

                    {/* Batch delete */}
                    {selectedFiles.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={deleteBatchMutation.isPending}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-medium transition-all disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            <span>Delete {selectedFiles.size}</span>
                        </button>
                    )}

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
                        <div className="w-4 flex-shrink-0" />
                        <SortableHeader field="name" label="Name" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="flex-1" />
                        <SortableHeader field="kind" label="Type" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-20 hidden sm:flex" />
                        <SortableHeader field="modified" label="Modified" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-28 hidden md:flex justify-end" />
                        <SortableHeader field="size" label="Size" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-20 hidden md:flex justify-end" />
                    </div>
                )}

                {/* File content area */}
                <div className={clsx('flex-1 overflow-y-auto min-h-0', viewLayout === 'grid' ? 'p-3' : 'p-2')}>
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
                                        : <FileCard entry={entry} selected={selectedFiles.has(entry.path)} onSelect={toggleSelectFile} onOpen={openEntry} onContextMenu={handleContextMenu} />
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
                                        : <FileRow entry={entry} selected={selectedFiles.has(entry.path)} onSelect={toggleSelectFile} onOpen={openEntry} onContextMenu={handleContextMenu} />
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
                                        key={entry.path}
                                        onDoubleClick={() => openEntry(entry)}
                                        onClick={() => toggleSelectFile(entry.path)}
                                        onContextMenu={(e) => handleContextMenu(e, entry)}
                                        className={clsx(
                                            'flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer select-none group transition-all border',
                                            selectedFiles.has(entry.path)
                                                ? 'bg-indigo-500/20 border-indigo-500/30'
                                                : 'hover:bg-slate-800/50 border-transparent',
                                        )}
                                    >
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
                        onPreview={setPreviewEntry}
                        onDelete={handleDelete}
                        onRename={startRename}
                        onDownload={downloadFile}
                        onCopy={handleCopy}
                    />
                )}
            </div>

            {/* File Preview Modal — rendered outside the dropzone div to cover full screen */}
            {previewEntry && (
                <FilePreviewModal entry={previewEntry} onClose={() => setPreviewEntry(null)} />
            )}
        </>
    );
}
