import type { ReactNode } from 'react';
import { getServerAuth } from '@/lib/auth/server';
import WorkspaceRouteShell from './WorkspaceRouteShell';

type WorkspaceRouteLayoutProps = {
    children: ReactNode;
};

export default async function WorkspaceRouteLayout({ children }: WorkspaceRouteLayoutProps) {
    const { user } = await getServerAuth();
    return <WorkspaceRouteShell isAuthenticated={Boolean(user)}>{children}</WorkspaceRouteShell>;
}
