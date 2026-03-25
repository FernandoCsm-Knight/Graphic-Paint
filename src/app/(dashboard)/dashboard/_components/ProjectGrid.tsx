'use client';

import { LuFolderSearch, LuSparkles } from 'react-icons/lu';
import type { Folder, Project } from '@/lib/supabase/workspace';
import ProjectCard from './ProjectCard';

type Props = {
    folders: Folder[];
    projects: Project[];
    onProjectDeleted: (id: string) => void;
    onProjectMoved: (project: Project) => void;
};

export default function ProjectGrid({ folders, projects, onProjectDeleted, onProjectMoved }: Props) {
    if (projects.length === 0) {
        return (
            <div className="module-card flex flex-1 items-center justify-center rounded-[2rem] p-8">
                <div className="max-w-md text-center">
                    <span
                        className="theme-module-accent-text mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                            background: 'color-mix(in srgb, var(--app-accent-soft) 60%, transparent)',
                        }}
                    >
                        <LuFolderSearch className="h-6 w-6" />
                    </span>
                    <h3 className="theme-sidebar-title mt-5 text-2xl font-bold">
                        Nenhum projeto nessa vista
                    </h3>
                    <p className="theme-sidebar-copy mt-3 text-sm leading-7">
                        Crie um projeto novo para preencher essa area com cards de modulo, historico e atalhos de abertura.
                    </p>
                    <div className="theme-mobile-pill mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]">
                        <LuSparkles className="h-4 w-4" />
                        Workspace pronta para começar
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="module-card min-h-0 flex-1 rounded-[2rem] p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {projects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        folders={folders}
                        project={project}
                        onDeleted={() => onProjectDeleted(project.id)}
                        onMoved={onProjectMoved}
                    />
                ))}
            </div>
        </div>
    );
}
