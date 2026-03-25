import { redirect } from 'next/navigation';
import AutomatonWorkspace from '../AutomatonWorkspace';
import { getAutomatonProjectSnapshot } from '@/lib/workspace/projectPersistence';
import { requireUser } from '@/lib/auth/server';

type AutomatonProjectPageProps = {
    params: Promise<{ projectId: string }>;
};

export default async function AutomatonProjectPage({ params }: AutomatonProjectPageProps) {
    const { projectId } = await params;
    await requireUser();
    let snapshot;

    try {
        snapshot = await getAutomatonProjectSnapshot(projectId);
    } catch {
        redirect('/dashboard');
    }

    return <AutomatonWorkspace projectId={projectId} initialSnapshot={snapshot} />;
}
