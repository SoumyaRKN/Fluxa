import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Folder,
    File,
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
} from '@/api/files';
import { useAppStore } from '@/store';
import type { FileEntry } from '@/types';

// ── Breadcrumb ─────────────────────────────────────────────────────────────────

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
    const parts = path.split('/').filter(Boolean);

    return (
        <nav className="flex items-center gap-1 text-sm text-slate-400 min-w-0 flex-wrap">
            <button
                onClick={() => onNavigate('/')}
                className="hover:text-white transition-colors flex-shrink-0"
            >
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

interface ContextMenuState {
    x: number;
    y: number;
    entry: FileEntry;
}

function ContextMenu({
    state,
    onClose,
    onDelete,
    onRename,
    onDownload,
    onCopy,
}: {
    state: ContextMenuState;
    onClose: () => void;
    onDelete: (path: string) => void;
    onRename: (entry: FileEntry) => void;
    onDownload: (path: string) => void;
    onCopy: (entry: FileEntry) => void;
}) {
    const items = [
        state.entry.kind === 'file' && {
            label: 'Download',
            icon: <Download size={14} />,
            onClick: () => {
                onDownload(state.entry.path);
                onClose();
            },
        },
        {
            label: 'Copy here',
            icon: <Copy size={14} />,
            onClick: () => {
                onCopy(state.entry);
                onClose();
            },
        },
        {
            label: 'Rename',
            icon: <Edit3 size={14} />,
            onClick: () => {
                onRename(state.entry);
                onClose();
            },
        },
        {
            label: 'Delete',
            icon: <Trash2 size={14} />,
            onClick: () => {
                onDelete(state.entry.path);
                onClose();
            },
            danger: true,
        },
    ].filter(Boolean) as {
        label: string;
        icon: React.ReactNode;
        onClick: () => void;
        danger?: boolean;
    }[];

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 min-w-[150px]"
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

// ── File Row ───────────────────────────────────────────────────────────────────

function FileRow({
    entry,
    selected,
    onSelect,
    onOpen,
    onContextMenu,
}: {
    entry: FileEntry;
    selected: boolean;
    onSelect: (path: string) => void;
    onOpen: (entry: FileEntry) => void;
    onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}) {
    const isDir = entry.kind === 'directory';

    function formatSize(bytes: number) {
        if (bytes === 0) return '—';
        if (isDir) return '—';
        const units = ['B', 'KB', 'MB', 'GB'];
        let val = bytes;
        let unit = 0;
        while (val >= 1024 && unit < units.length - 1) {
            val /= 1024;
            unit++;
        }
        return `${val.toFixed(1)} ${units[unit]}`;
    }

    function formatDate(s: string | null) {
        if (!s) return '—';
        return new Date(s).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

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
            <div className="flex-shrink-0">
                {isDir ? (
                    <Folder size={18} className="text-amber-400" />
                ) : (
                    <File size={18} className="text-slate-400 group-hover:text-slate-300" />
                )}
            </div>
            <span className="flex-1 text-sm font-medium truncate" title={entry.name}>
                {entry.name}
            </span>
            <span className="text-xs text-slate-500 w-24 text-right hidden sm:block">
                {formatDate(entry.modified)}
            </span>
            <span className="text-xs text-slate-500 w-16 text-right hidden md:block">
                {formatSize(entry.size)}
            </span>
        </div>
    );
}

// ── Main Explorer ──────────────────────────────────────────────────────────────

export function FileExplorer() {
    const { currentPath, setCurrentPath, selectedFiles, toggleSelectFile, clearSelection, addNotification } =
        useAppStore();

    const { data: files, isLoading, isError, error, refetch } = useFileList(currentPath);
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

    // ── Dropzone ─────────────────────────────────────────────────────────────────

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            for (const file of acceptedFiles) {
                setUploadProgress(0);
                try {
                    await uploadMutation.mutateAsync({
                        file,
                        destPath: currentPath,
                        onProgress: setUploadProgress,
                    });
                    addNotification({ type: 'success', message: `Uploaded ${file.name}` });
                } catch (e: any) {
                    addNotification({ type: 'error', message: e.message });
                }
            }
            setUploadProgress(null);
        },
        [currentPath, uploadMutation, addNotification],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
    });

    // ── Navigation ────────────────────────────────────────────────────────────────

    function navigate(entry: FileEntry) {
        if (entry.kind === 'directory') {
            clearSelection();
            setCurrentPath(entry.path);
        }
    }

    function goUp() {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
            clearSelection();
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────────────

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
                message: `Deleted ${data.deleted} item${data.deleted !== 1 ? 's' : ''}${data.errors?.length ? `, ${data.errors.length} error(s)` : ''
                    }`,
            });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
    }

    function startRename(entry: FileEntry) {
        setRenameEntry(entry);
        setRenameValue(entry.name);
    }

    async function handleCopy(entry: FileEntry) {
        // Copy to current directory with "_copy" suffix to avoid conflict
        const name = entry.name;
        const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
        const base = ext ? name.slice(0, name.lastIndexOf('.')) : name;
        const destName = `${base}_copy${ext}`;
        const destPath =
            currentPath === '/'
                ? `/${destName}`
                : `${currentPath}/${destName}`;
        try {
            await copyMutation.mutateAsync({ from: entry.path, to: destPath });
            addNotification({ type: 'success', message: `Copied as "${destName}"` });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
    }

    async function commitRename() {
        if (!renameEntry || renameValue.trim() === renameEntry.name) {
            setRenameEntry(null);
            return;
        }
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
        const newPath =
            currentPath === '/'
                ? `/${mkdirValue.trim()}`
                : `${currentPath}/${mkdirValue.trim()}`;
        try {
            await mkdirMutation.mutateAsync(newPath);
            addNotification({ type: 'success', message: 'Folder created' });
        } catch (e: any) {
            addNotification({ type: 'error', message: e.message });
        }
        setShowMkdir(false);
        setMkdirValue('');
    }

    // ── Render ────────────────────────────────────────────────────────────────────

    return (
        <div
            {...getRootProps()}
            className={clsx(
                'flex flex-col flex-1 min-h-0 relative transition-all',
                isDragActive && 'ring-2 ring-cyan-500/50 ring-inset bg-cyan-500/5',
            )}
        >
            <input {...getInputProps()} />

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                <button
                    onClick={goUp}
                    disabled={currentPath === '/'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Go up"
                >
                    <ArrowLeft size={16} />
                </button>

                <Breadcrumb path={currentPath} onNavigate={(p) => { clearSelection(); setCurrentPath(p); }} />

                <div className="flex-1" />

                {selectedFiles.size > 0 && (
                    <button
                        onClick={handleDeleteSelected}
                        disabled={deleteBatchMutation.isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-medium transition-all disabled:opacity-50"
                        title={`Delete ${selectedFiles.size} selected`}
                    >
                        <Trash2 size={14} />
                        <span>Delete {selectedFiles.size}</span>
                    </button>
                )}

                <button
                    onClick={() => { setShowMkdir(true); setMkdirValue(''); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    title="New folder"
                >
                    <FolderPlus size={16} />
                </button>

                <label
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                    title="Upload file"
                >
                    <Upload size={16} />
                    <input
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={async (e) => {
                            const uploaded = Array.from(e.target.files ?? []);
                            for (const f of uploaded) {
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

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2">
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

                {!isLoading && !isError && files?.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500">
                        <Folder size={32} className="opacity-40" />
                        <p className="text-sm">Empty folder</p>
                        <p className="text-xs">Drop files here to upload</p>
                    </div>
                )}

                {!isLoading &&
                    !isError &&
                    files?.map((entry) => (
                        <div key={entry.path}>
                            {renameEntry?.path === entry.path ? (
                                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                                    {entry.kind === 'directory' ? (
                                        <Folder size={18} className="text-amber-400 flex-shrink-0" />
                                    ) : (
                                        <File size={18} className="text-slate-400 flex-shrink-0" />
                                    )}
                                    <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitRename();
                                            if (e.key === 'Escape') setRenameEntry(null);
                                        }}
                                        onBlur={commitRename}
                                        className="flex-1 bg-transparent text-white text-sm outline-none"
                                    />
                                </div>
                            ) : (
                                <FileRow
                                    entry={entry}
                                    selected={selectedFiles.has(entry.path)}
                                    onSelect={toggleSelectFile}
                                    onOpen={navigate}
                                    onContextMenu={handleContextMenu}
                                />
                            )}
                        </div>
                    ))}
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
                    onDelete={handleDelete}
                    onRename={startRename}
                    onDownload={downloadFile}
                    onCopy={handleCopy}
                />
            )}
        </div>
    );
}
