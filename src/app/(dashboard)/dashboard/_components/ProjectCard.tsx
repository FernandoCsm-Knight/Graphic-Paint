'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuClock3, LuFolderInput, LuTrash2 } from 'react-icons/lu';
import type { Folder, Project } from '@/lib/supabase/workspace';
import { deleteProject, moveProjectToFolder } from '@/lib/supabase/workspace';
import { moduleIcons } from '@/components/ModuleCard';

type Props = {
    folders: Folder[];
    project: Project;
    onDeleted: () => void;
    onMoved: (project: Project) => void;
};

export default function ProjectCard({ folders, project, onDeleted, onMoved }: Props) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const [moving, setMoving] = useState(false);

    function handleOpen() {
        router.push(`/${project.module}/${project.id}`);
    }

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        if (!confirm(`Excluir "${project.name}"?`)) return;
        setDeleting(true);
        try {
            await deleteProject(project.id);
            onDeleted();
        } finally {
            setDeleting(false);
        }
    }

    async function handleMove(folderId: string) {
        setMoving(true);
        try {
            const updatedProject = await moveProjectToFolder({
                projectId: project.id,
                folderId: folderId || null,
            });
            onMoved(updatedProject);
        } finally {
            setMoving(false);
        }
    }

    const date = new Date(project.updated_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div
            className="module-card module-card-button flex h-full cursor-pointer flex-col rounded-[1.75rem] p-4 transition duration-200"
            onClick={handleOpen}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <span
                    className="theme-module-accent-text flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                        background: 'color-mix(in srgb, var(--app-accent-soft) 62%, transparent)',
                    }}
                >
                    {moduleIcons[project.module] ?? '?'}
                </span>

                <span
                    className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]"
                    style={{
                        background: 'color-mix(in srgb, var(--app-sidebar-surface) 72%, transparent)',
                        color: 'var(--app-sidebar-text-muted)',
                        border: '1px solid color-mix(in srgb, var(--app-sidebar-border) 75%, transparent)',
                    }}
                >
                    {project.module}
                </span>
            </div>

            <div className="flex-1">
                <p className="theme-sidebar-title text-lg font-semibold leading-6">
                    {project.name}
                </p>
                <div className="theme-sidebar-copy-muted mt-3 flex items-center gap-2 text-xs">
                    <LuClock3 className="h-4 w-4" />
                    <span>Atualizado em {date}</span>
                </div>
            </div>

            <label
                className="mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2"
                style={{
                    borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 78%, transparent)',
                    background: 'color-mix(in srgb, var(--app-sidebar-surface) 52%, transparent)',
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <LuFolderInput className="h-4 w-4 shrink-0" style={{ color: 'var(--app-sidebar-text-muted)' }} />
                <select
                    value={project.folder_id ?? ''}
                    onChange={(event) => void handleMove(event.target.value)}
                    disabled={moving}
                    className="min-w-0 grow bg-transparent text-sm outline-none"
                    style={{ color: 'var(--app-shell-text)' }}
                    aria-label="Mover projeto de pasta"
                >
                    <option value="">Sem pasta</option>
                    {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                            {folder.name}
                        </option>
                    ))}
                </select>
            </label>

            <div
                className="mt-5 flex items-center justify-between rounded-2xl border px-3 py-3"
                style={{
                    borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 78%, transparent)',
                    background: 'color-mix(in srgb, var(--app-sidebar-surface) 58%, transparent)',
                }}
            >
                <button
                    onClick={handleDelete}
                    disabled={deleting || moving}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ color: 'var(--app-sidebar-text-muted)' }}
                    title="Excluir projeto"
                >
                    <LuTrash2 className="h-4 w-4" />
                    {deleting ? 'Excluindo' : 'Excluir'}
                </button>
            </div>
        </div>
    );
}
