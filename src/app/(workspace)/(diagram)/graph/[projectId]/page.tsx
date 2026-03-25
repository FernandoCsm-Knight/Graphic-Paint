import { redirect } from 'next/navigation';
import GraphWorkspace from '../GraphWorkspace';
import { getGraphProjectSnapshot } from '@/lib/workspace/projectPersistence';
import { requireUser } from '@/lib/auth/server';

type GraphProjectPageProps = {
    params: Promise<{ projectId: string }>;
};

export default async function GraphProjectPage({ params }: GraphProjectPageProps) {
    const { projectId } = await params;
    await requireUser();
    let snapshot;

    try {
        snapshot = await getGraphProjectSnapshot(projectId);
    } catch {
        redirect('/dashboard');
    }

    return <GraphWorkspace projectId={projectId} initialSnapshot={snapshot} />;
}
