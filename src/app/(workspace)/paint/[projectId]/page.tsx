import { requireUser } from '@/lib/auth/server';
import { getPaintProjectSnapshot } from '@/lib/workspace/projectPersistence';
import { redirect } from 'next/navigation';
import PaintWorkspace from '../PaintWorkspace';

type Props = {
    params: Promise<{ projectId: string }>;
};

export default async function PaintProjectPage({ params }: Props) {
    const { projectId } = await params;

    const { supabase, user } = await requireUser();

    // Verify the project belongs to this user
    const { data: project } = await supabase
        .from('projects')
        .select('id, name, module')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!project || project.module !== 'paint') redirect('/dashboard');

    let snapshot;
    try {
        snapshot = await getPaintProjectSnapshot(projectId);
    } catch {
        redirect('/dashboard');
    }

    return <PaintWorkspace projectId={projectId} initialSnapshot={snapshot} />;
}
