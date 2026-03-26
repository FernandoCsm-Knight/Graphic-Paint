'use client';

import { useState, useTransition } from 'react';
import { LuFolderClosed, LuFolderOpen, LuLayers3, LuPlus, LuSparkles } from 'react-icons/lu';
import { getWorkspaceSnapshot, type Folder, type Project } from '@/lib/supabase/workspace';
import FolderTree from './FolderTree';
import ProjectGrid from './ProjectGrid';
import NewProjectModal from './NewProjectModal';

type Props = {
    initialFolders: Folder[];
    initialProjects: Project[];
};

export default function DashboardClient({ initialFolders, initialProjects }: Props) {
    const [folders, setFolders] = useState<Folder[]>(initialFolders);
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined);
    const [showModal, setShowModal] = useState(false);
    const [, startTransition] = useTransition();

    const visibleProjects = activeFolderId === undefined
        ? projects
        : projects.filter((project) => project.folder_id === activeFolderId);

    const currentFolderName = activeFolderId === undefined
        ? 'Todos os projetos'
        : activeFolderId === null
            ? 'Sem pasta'
            : (folders.find((folder) => folder.id === activeFolderId)?.name ?? 'Pasta');

    const stats = [
        {
            label: 'Projetos visíveis',
            value: visibleProjects.length,
            icon: <LuLayers3 className="h-4 w-4" />,
        },
        {
            label: 'Pastas',
            value: folders.length,
            icon: <LuFolderClosed className="h-4 w-4" />,
        },
        {
            label: 'Vista atual',
            value: activeFolderId === undefined ? 'Tudo' : activeFolderId === null ? 'Solto' : 'Pasta',
            icon: <LuFolderOpen className="h-4 w-4" />,
        },
    ];

    function refreshWorkspace() {
        startTransition(async () => {
            const snapshot = await getWorkspaceSnapshot();
            setFolders(snapshot.folders);
            setProjects(snapshot.projects);
        });
    }

    return (
        <div className="mx-auto flex max-w-7xl flex-col p-4 sm:p-6">
            <section className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="module-card rounded-[2rem] p-6">
                    <span
                        className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--app-accent-border) 70%, transparent)',
                            background: 'color-mix(in srgb, var(--app-accent-soft) 52%, transparent)',
                            color: 'var(--app-accent-text-strong)',
                        }}
                    >
                        Workspace principal
                    </span>

                    <h1 className="theme-sidebar-title mt-5 text-4xl font-black tracking-[-0.04em]">
                        Organize projetos, troque de módulo e continue criando sem perder contexto.
                    </h1>

                    <p className="theme-sidebar-copy mt-4 max-w-3xl text-sm leading-8 md:text-base">
                        Essa área agora acompanha a linguagem visual da landing e do auth: mais contraste,
                        melhor hierarquia e cards com mais presença para navegar seus projetos.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    {stats.map((item) => (
                        <div key={item.label} className="module-card flex gap-4 rounded-3xl p-4">
                            <span
                                className="theme-module-accent-text flex h-10 w-10 items-center justify-center rounded-2xl border"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                                    background: 'color-mix(in srgb, var(--app-accent-soft) 62%, transparent)',
                                }}
                            >
                                {item.icon}
                            </span>
                            <p className="theme-sidebar-copy-muted mt-4 text-[11px] font-semibold uppercase tracking-[0.26em]">
                                {item.label}
                            </p>
                            <p className="theme-sidebar-title mt-2 text-2xl font-black">
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="flex min-h-200 gap-4 lg:gap-5">
                <aside
                    className="module-card hidden w-72 shrink-0 flex-col rounded-[2rem] lg:flex"
                    style={{
                        background: 'color-mix(in srgb, var(--app-sidebar-surface) 82%, transparent)',
                    }}
                >
                    <div className="border-b px-5 py-5" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                                    Biblioteca
                                </p>
                                <h2 className="theme-sidebar-title mt-2 text-xl font-semibold">
                                    Pastas e filtros
                                </h2>
                            </div>

                            <span className="theme-mobile-pill rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                                {folders.length}
                            </span>
                        </div>
                    </div>

                    <FolderTree
                        folders={folders}
                        activeFolderId={activeFolderId}
                        onSelectFolder={setActiveFolderId}
                        onFoldersChange={setFolders}
                        onWorkspaceRefresh={refreshWorkspace}
                    />
                </aside>

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div className="module-card rounded-[2rem] p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                                    Vista atual
                                </p>
                                <h2 className="theme-sidebar-title mt-3 text-3xl font-black tracking-[-0.03em]">
                                    {currentFolderName}
                                </h2>
                                <p className="theme-sidebar-copy mt-3 max-w-2xl text-sm leading-7">
                                    {visibleProjects.length === 0
                                        ? 'Nenhum projeto nessa vista ainda. Crie um novo para começar.'
                                        : `${visibleProjects.length} projeto(s) pronto(s) para abrir, editar e continuar de onde você parou.`}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowModal(true)}
                                className="module-card-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                                style={{
                                    background: 'var(--app-accent-text)',
                                    color: 'var(--ui-menu-card-surface)',
                                }}
                            >
                                <LuPlus className="h-4 w-4" />
                                Novo projeto
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:hidden">
                        <div className="module-card rounded-[2rem] p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                                        Biblioteca
                                    </p>
                                    <h2 className="theme-sidebar-title mt-2 text-xl font-semibold">
                                        Pastas
                                    </h2>
                                </div>

                                <span className="theme-mobile-pill rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                                    <LuSparkles className="h-4 w-4" />
                                </span>
                            </div>

                            <FolderTree
                                folders={folders}
                                activeFolderId={activeFolderId}
                                onSelectFolder={setActiveFolderId}
                                onFoldersChange={setFolders}
                                onWorkspaceRefresh={refreshWorkspace}
                            />
                        </div>
                    </div>

                    <ProjectGrid
                        folders={folders}
                        projects={visibleProjects}
                        onProjectDeleted={(id) => setProjects((projectList) => projectList.filter((project) => project.id !== id))}
                        onProjectMoved={(updatedProject) => {
                            setProjects((projectList) => projectList.map((project) => (
                                project.id === updatedProject.id ? updatedProject : project
                            )));
                            refreshWorkspace();
                        }}
                    />
                </div>
            </div>

            {showModal && (
                <NewProjectModal
                    folders={folders}
                    defaultFolderId={activeFolderId ?? null}
                    onClose={() => setShowModal(false)}
                    onCreated={(project) => {
                        setProjects((projectList) => [project, ...projectList]);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}
