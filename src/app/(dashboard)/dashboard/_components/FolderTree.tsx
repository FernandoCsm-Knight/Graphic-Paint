'use client';

import { useState } from 'react';
import { LuFolderClosed, LuFolderOpen, LuPlus, LuTrash2 } from 'react-icons/lu';
import type { Folder } from '@/lib/supabase/workspace';
import { createFolder, deleteFolder } from '@/lib/supabase/workspace';

type Props = {
    folders: Folder[];
    activeFolderId: string | null | undefined;
    onSelectFolder: (id: string | null | undefined) => void;
    onFoldersChange: (folders: Folder[]) => void;
    onWorkspaceRefresh: () => void;
};

export default function FolderTree({ folders, activeFolderId, onSelectFolder, onFoldersChange, onWorkspaceRefresh }: Props) {
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    async function handleCreate() {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setCreating(true);
        try {
            const folder = await createFolder({ name: trimmed });
            onFoldersChange([...folders, folder]);
            setNewName('');
            onWorkspaceRefresh();
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        setDeleting(id);
        try {
            await deleteFolder(id);
            onFoldersChange(folders.filter((folder) => folder.id !== id));
            if (activeFolderId === id) onSelectFolder(undefined);
            onWorkspaceRefresh();
        } finally {
            setDeleting(null);
        }
    }

    const itemClass = (active: boolean) =>
        `w-full rounded-2xl border px-3 py-3 text-left transition duration-200 ${
            active ? 'theme-module-card-active ring-1' : 'theme-module-card-idle'
        }`;

    return (
        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
            <button
                onClick={() => onSelectFolder(undefined)}
                className={itemClass(activeFolderId === undefined)}
            >
                <div className="flex items-center gap-3">
                    <span
                        className="theme-module-accent-text flex h-9 w-9 items-center justify-center rounded-2xl border"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                            background: 'color-mix(in srgb, var(--app-accent-soft) 62%, transparent)',
                        }}
                    >
                        <LuFolderOpen className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="theme-sidebar-title text-sm font-semibold">Todos os projetos</p>
                        <p className="theme-sidebar-copy-muted text-xs">Visão completa</p>
                    </div>
                </div>
            </button>

            <button
                onClick={() => onSelectFolder(null)}
                className={itemClass(activeFolderId === null)}
            >
                <div className="flex items-center gap-3">
                    <span
                        className="theme-module-accent-text flex h-9 w-9 items-center justify-center rounded-2xl border"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 80%, transparent)',
                            background: 'color-mix(in srgb, var(--app-sidebar-surface) 68%, transparent)',
                        }}
                    >
                        <LuFolderClosed className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="theme-sidebar-title text-sm font-semibold">Sem pasta</p>
                        <p className="theme-sidebar-copy-muted text-xs">Projetos soltos</p>
                    </div>
                </div>
            </button>

            {folders.length > 0 ? (
                <div className="pt-3">
                    <p className="theme-sidebar-copy-muted px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.28em]">
                        Pastas criadas
                    </p>

                    <div className="space-y-2">
                        {folders.map((folder) => (
                            <div key={folder.id} className="group flex items-center gap-2">
                                <button
                                    onClick={() => onSelectFolder(folder.id)}
                                    className={itemClass(activeFolderId === folder.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="theme-module-accent-text flex h-9 w-9 items-center justify-center rounded-2xl border"
                                            style={{
                                                borderColor: 'color-mix(in srgb, var(--app-accent-border) 70%, transparent)',
                                                background: 'color-mix(in srgb, var(--app-accent-soft) 50%, transparent)',
                                            }}
                                        >
                                            <LuFolderClosed className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="theme-sidebar-title truncate text-sm font-semibold">
                                                {folder.name}
                                            </p>
                                            <p className="theme-sidebar-copy-muted text-xs">
                                                Abrir pasta
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleDelete(folder.id)}
                                    disabled={deleting === folder.id}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border opacity-0 transition-all duration-200 group-hover:opacity-100 disabled:opacity-40"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 75%, transparent)',
                                        color: 'var(--app-sidebar-text-muted)',
                                        background: 'color-mix(in srgb, var(--app-sidebar-surface) 70%, transparent)',
                                    }}
                                    title="Excluir pasta"
                                >
                                    <LuTrash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div
                className="mt-auto rounded-[1.6rem] border p-3"
                style={{
                    borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 82%, transparent)',
                    background: 'color-mix(in srgb, var(--app-sidebar-surface) 55%, transparent)',
                }}
            >
                <p className="theme-sidebar-copy-muted mb-3 text-[11px] font-semibold uppercase tracking-[0.28em]">
                    Nova pasta
                </p>
                <div className="flex gap-2">
                    <input
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleCreate(); }}
                        placeholder="Nome da pasta"
                        className="ui-input min-w-0 flex-1 rounded-2xl px-3 py-2 text-sm outline-none"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={creating || !newName.trim()}
                        className="module-card-button inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold disabled:opacity-40"
                        style={{
                            background: 'var(--app-accent-text)',
                            color: 'var(--ui-menu-card-surface)',
                        }}
                        title="Criar pasta"
                    >
                        <LuPlus className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
