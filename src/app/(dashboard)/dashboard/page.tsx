import { requireUser } from '@/lib/auth/server';
import { getFolders, getProjects } from '@/lib/supabase/workspace';
import DashboardHeader from '../_components/DashboardHeader';
import DashboardClient from './_components/DashboardClient';

export default async function DashboardPage() {
    const { supabase, user } = await requireUser();

    const [folders, projects] = await Promise.all([
        getFolders(user.id, supabase),
        getProjects(user.id, undefined, supabase),
    ]);

    return (
        <div
            className="min-h-full flex flex-col"
            style={{
                background: `
                    radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--app-accent-soft-strong) 42%, transparent) 0%, transparent 26%),
                    radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--app-status-available-bg) 24%, transparent) 0%, transparent 22%),
                    radial-gradient(circle at 50% 118%, color-mix(in srgb, var(--app-accent-soft) 30%, transparent) 0%, transparent 36%),
                    var(--app-body-accent-primary)
                `,
                color: 'var(--app-shell-text)',
            }}
        >
            <DashboardHeader userEmail={user.email ?? ''} />
            <main className="grow overflow-auto">
                <DashboardClient
                    initialFolders={folders}
                    initialProjects={projects}
                />
            </main>
        </div>
    );
}
