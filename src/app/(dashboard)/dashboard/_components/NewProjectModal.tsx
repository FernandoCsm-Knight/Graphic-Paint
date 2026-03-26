'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowRight, LuFolderClosed, LuLayers3, LuX } from 'react-icons/lu';
import type { Folder, Project } from '@/lib/supabase/workspace';
import { createProject } from '@/lib/supabase/workspace';
import { moduleIcons } from '@/components/ModuleCard';

type Module = 'paint' | 'graph' | 'automaton';

const MODULES: { id: Module; label: string; summary: string }[] = [
    { id: 'paint', label: 'Paint', summary: 'Canvas e desenho visual.' },
    { id: 'graph', label: 'Graph', summary: 'Grafos e algoritmos.' },
    { id: 'automaton', label: 'Automaton', summary: 'Autômatos e simulações.' },
];

type Props = {
    folders: Folder[];
    defaultFolderId: string | null;
    onClose: () => void;
    onCreated: (project: Project) => void;
};

export default function NewProjectModal({ folders, defaultFolderId, onClose, onCreated }: Props) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [module, setModule] = useState<Module>('paint');
    const [folderId, setFolderId] = useState<string>(defaultFolderId ?? '');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setError(null);
        setLoading(true);

        try {
            const project = await createProject({
                name: trimmed,
                module,
                folderId: folderId || null,
            });
            onCreated(project);
            router.push(`/${module}/${project.id}`);
        } catch (err) {
            setError((err as Error).message);
            setLoading(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className="module-card w-full max-w-2xl rounded-[2rem] p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                            Novo projeto
                        </p>
                        <h2 className="theme-sidebar-title mt-3 text-3xl font-black tracking-[-0.03em]">
                            Crie um novo espaço de trabalho
                        </h2>
                        <p className="theme-sidebar-copy mt-3 max-w-xl text-sm leading-7">
                            Escolha um módulo, defina um nome e organize em uma pasta se quiser.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="sidebar-toggle"
                        aria-label="Fechar modal"
                    >
                        <LuX className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <label className="flex flex-col gap-2">
                        <span className="theme-sidebar-copy-muted text-xs font-semibold uppercase tracking-[0.22em]">
                            Nome do projeto
                        </span>
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            autoFocus
                            placeholder="Ex: Árvore de estados"
                            className="ui-input rounded-2xl px-4 py-3 text-sm outline-none"
                        />
                    </label>

                    <fieldset>
                        <legend className="theme-sidebar-copy-muted mb-3 text-xs font-semibold uppercase tracking-[0.22em]">
                            Módulo
                        </legend>
                        <div className="grid gap-3 md:grid-cols-3">
                            {MODULES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setModule(item.id)}
                                    className={`module-card module-card-button rounded-[1.5rem] p-4 text-left transition duration-200 ${
                                        module === item.id ? 'theme-module-card-active ring-1' : 'theme-module-card-idle'
                                    }`}
                                >
                                    <span
                                        className="theme-module-accent-text flex h-11 w-11 items-center justify-center rounded-2xl border"
                                        style={{
                                            borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                                            background: 'color-mix(in srgb, var(--app-accent-soft) 62%, transparent)',
                                        }}
                                    >
                                        {moduleIcons[item.id] ?? '?'}
                                    </span>
                                    <p className="theme-sidebar-title mt-4 text-lg font-semibold">
                                        {item.label}
                                    </p>
                                    <p className="theme-sidebar-copy mt-2 text-sm leading-6">
                                        {item.summary}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    {folders.length > 0 && (
                        <label className="flex flex-col gap-2">
                            <span className="theme-sidebar-copy-muted inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]">
                                <LuFolderClosed className="h-4 w-4" />
                                Pasta
                            </span>
                            <select
                                value={folderId}
                                onChange={(event) => setFolderId(event.target.value)}
                                className="ui-input rounded-2xl px-4 py-3 text-sm outline-none"
                            >
                                <option value="">Sem pasta</option>
                                {folders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    {error ? (
                        <div
                            className="rounded-2xl border px-4 py-3 text-sm"
                            style={{
                                borderColor: 'color-mix(in srgb, #f87171 45%, transparent)',
                                background: 'color-mix(in srgb, #f87171 12%, transparent)',
                                color: '#fecaca',
                            }}
                        >
                            {error}
                        </div>
                    ) : null}

                    <div
                        className="flex flex-col gap-3 rounded-[1.6rem] border p-4 sm:flex-row sm:items-center sm:justify-between"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 82%, transparent)',
                            background: 'color-mix(in srgb, var(--app-sidebar-surface) 55%, transparent)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="theme-module-accent-text flex h-10 w-10 items-center justify-center rounded-2xl border"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                                    background: 'color-mix(in srgb, var(--app-accent-soft) 62%, transparent)',
                                }}
                            >
                                <LuLayers3 className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="theme-sidebar-title text-sm font-semibold">
                                    {module === 'paint' ? 'Projeto de desenho' : module === 'graph' ? 'Projeto de grafo' : 'Projeto de autômato'}
                                </p>
                                <p className="theme-sidebar-copy text-xs leading-6">
                                    O projeto será criado e aberto logo em seguida.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="ui-button rounded-2xl px-4 py-3 text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="module-card-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
                                style={{
                                    background: 'var(--app-accent-text)',
                                    color: 'var(--ui-menu-card-surface)',
                                }}
                            >
                                {loading ? 'Criando...' : 'Criar projeto'}
                                <LuArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
