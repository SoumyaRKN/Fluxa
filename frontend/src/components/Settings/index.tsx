import { useEffect, useState } from 'react';
import {
    X,
    Save,
    RotateCcw,
    Folder,
    Server,
    HardDrive,
    Layers,
} from 'lucide-react';
import clsx from 'clsx';
import { useSettings, useUpdateSettings } from '@/api/settings';
import { useAppStore } from '@/store';
import type { SettingsPatch } from '@/types';

// ── Byte helpers ───────────────────────────────────────────────────────────────

function bytesToDisplay(bytes: number): { value: number; unit: 'MiB' | 'GiB' } {
    if (bytes >= 1024 * 1024 * 1024) {
        return { value: bytes / (1024 * 1024 * 1024), unit: 'GiB' };
    }
    return { value: bytes / (1024 * 1024), unit: 'MiB' };
}

function displayToBytes(value: number, unit: 'MiB' | 'GiB'): number {
    return unit === 'GiB'
        ? Math.round(value * 1024 * 1024 * 1024)
        : Math.round(value * 1024 * 1024);
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
    device_name: string;
    root_dir: string;
    chunk_size_value: number;
    chunk_size_unit: 'MiB' | 'GiB';
    max_upload_value: number;
    max_upload_unit: 'MiB' | 'GiB';
}

function settingsToForm(s: {
    device_name: string;
    root_dir: string;
    chunk_size: number;
    max_upload_size: number;
}): FormState {
    const cs = bytesToDisplay(s.chunk_size);
    const mu = bytesToDisplay(s.max_upload_size);
    return {
        device_name: s.device_name,
        root_dir: s.root_dir,
        chunk_size_value: parseFloat(cs.value.toFixed(2)),
        chunk_size_unit: cs.unit,
        max_upload_value: parseFloat(mu.value.toFixed(2)),
        max_upload_unit: mu.unit,
    };
}

function formToPatch(form: FormState, original: FormState): SettingsPatch {
    const patch: SettingsPatch = {};
    if (form.device_name !== original.device_name) {
        patch.device_name = form.device_name;
    }
    if (form.root_dir !== original.root_dir) {
        patch.root_dir = form.root_dir;
    }
    const newChunk = displayToBytes(form.chunk_size_value, form.chunk_size_unit);
    const origChunk = displayToBytes(original.chunk_size_value, original.chunk_size_unit);
    if (newChunk !== origChunk) patch.chunk_size = newChunk;

    const newUpload = displayToBytes(form.max_upload_value, form.max_upload_unit);
    const origUpload = displayToBytes(original.max_upload_value, original.max_upload_unit);
    if (newUpload !== origUpload) patch.max_upload_size = newUpload;

    return patch;
}

// ── Field components ───────────────────────────────────────────────────────────

function FieldLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div className="flex items-center gap-2 mb-1.5 text-slate-300 text-sm font-medium">
            <Icon size={14} className="text-cyan-400 flex-shrink-0" />
            {label}
        </div>
    );
}

function TextInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
    );
}

function NumberWithUnit({
    value,
    unit,
    onValueChange,
    onUnitChange,
    min,
    step,
}: {
    value: number;
    unit: 'MiB' | 'GiB';
    onValueChange: (v: number) => void;
    onUnitChange: (u: 'MiB' | 'GiB') => void;
    min?: number;
    step?: number;
}) {
    return (
        <div className="flex gap-2">
            <input
                type="number"
                value={value}
                min={min ?? 1}
                step={step ?? 1}
                onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <select
                value={unit}
                onChange={(e) => onUnitChange(e.target.value as 'MiB' | 'GiB')}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            >
                <option value="MiB">MiB</option>
                <option value="GiB">GiB</option>
            </select>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SettingsModal() {
    const { showSettings, setShowSettings, addNotification } = useAppStore();
    const { data: settings, isLoading } = useSettings();
    const { mutate: updateSettings, isPending } = useUpdateSettings();

    const [form, setForm] = useState<FormState | null>(null);
    const [original, setOriginal] = useState<FormState | null>(null);

    // Populate form when settings load
    useEffect(() => {
        if (settings && !form) {
            const f = settingsToForm(settings);
            setForm(f);
            setOriginal(f);
        }
    }, [settings, form]);

    if (!showSettings) return null;

    function handleReset() {
        if (original) setForm(original);
    }

    function handleSave() {
        if (!form || !original) return;
        const patch = formToPatch(form, original);
        if (Object.keys(patch).length === 0) {
            addNotification({ type: 'info', message: 'No changes to save.' });
            return;
        }
        updateSettings(patch, {
            onSuccess: (updated) => {
                const newForm = settingsToForm(updated);
                setForm(newForm);
                setOriginal(newForm);
                addNotification({ type: 'success', message: 'Settings saved.' });
            },
            onError: (err) => {
                addNotification({ type: 'error', message: err.message });
            },
        });
    }

    function update(key: keyof FormState, value: FormState[typeof key]) {
        setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    }

    const isDirty = form && original ? Object.keys(formToPatch(form, original)).length > 0 : false;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
            {/* Panel */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
                    <h2 className="text-white font-semibold text-lg">Settings</h2>
                    <button
                        onClick={() => setShowSettings(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {isLoading || !form ? (
                        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                            Loading settings…
                        </div>
                    ) : (
                        <>
                            {/* Device Name */}
                            <div>
                                <FieldLabel icon={Server} label="Device Name" />
                                <TextInput
                                    value={form.device_name}
                                    onChange={(v) => update('device_name', v)}
                                    placeholder="My Computer"
                                />
                                <p className="mt-1.5 text-slate-500 text-xs">
                                    Shown to other devices on the LAN.
                                </p>
                            </div>

                            {/* Root Directory */}
                            <div>
                                <FieldLabel icon={Folder} label="Root Directory" />
                                <TextInput
                                    value={form.root_dir}
                                    onChange={(v) => update('root_dir', v)}
                                    placeholder="/home/user"
                                />
                                <p className="mt-1.5 text-slate-500 text-xs">
                                    The folder that Fluxa browses and serves. Must exist on the server.
                                </p>
                            </div>

                            {/* Chunk Size */}
                            <div>
                                <FieldLabel icon={Layers} label="Transfer Chunk Size" />
                                <NumberWithUnit
                                    value={form.chunk_size_value}
                                    unit={form.chunk_size_unit}
                                    onValueChange={(v) => update('chunk_size_value', v)}
                                    onUnitChange={(u) => update('chunk_size_unit', u)}
                                    min={0.0625}
                                    step={0.5}
                                />
                                <p className="mt-1.5 text-slate-500 text-xs">
                                    Size of each chunk during peer-to-peer transfers (64 KiB – 64 MiB).
                                    Larger values are faster on good connections.
                                </p>
                            </div>

                            {/* Max Upload Size */}
                            <div>
                                <FieldLabel icon={HardDrive} label="Max Upload Size" />
                                <NumberWithUnit
                                    value={form.max_upload_value}
                                    unit={form.max_upload_unit}
                                    onValueChange={(v) => update('max_upload_value', v)}
                                    onUnitChange={(u) => update('max_upload_unit', u)}
                                    min={1}
                                    step={256}
                                />
                                <p className="mt-1.5 text-slate-500 text-xs">
                                    Maximum size for a single file upload via the browser (1 MiB – 100 GiB).
                                </p>
                            </div>

                            {/* Info banner */}
                            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-slate-400 text-xs leading-relaxed">
                                All settings take effect immediately — no restart required.
                                The bind address and port can only be changed via environment variables
                                (<span className="font-mono text-slate-300">FLUXA_PORT</span>,{' '}
                                <span className="font-mono text-slate-300">FLUXA_HOST</span>) before starting Fluxa.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {form && (
                    <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
                        <button
                            onClick={handleReset}
                            disabled={!isDirty || isPending}
                            className={clsx(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                                isDirty && !isPending
                                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                    : 'text-slate-600 cursor-not-allowed',
                            )}
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!isDirty || isPending}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                isDirty && !isPending
                                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                            )}
                        >
                            <Save size={14} />
                            {isPending ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
