'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import FloatingInfoBadge from '@/components/FloatingInfoBadge';
import ClientShell from '@/components/ClientShell';
import { useWorkspaceContext } from '@/context/WorkspaceContext';
import WorkspaceProvider from '@/context/providers/WorkspaceProvider';
import WorkspaceShellProvider from '@/context/providers/WorkspaceShellProvider';
import { type WorkspaceShellOptions } from '@/context/WorkspaceShellContext';

type WorkspaceShellProps = {
    children: ReactNode;
};

type WorkspaceRouteLayoutProps = WorkspaceShellProps & {
    isAuthenticated: boolean;
};

function WorkspaceShell({ children }: WorkspaceShellProps) {
    const { containerRef, isCanvasPanning, isPanModeActive } = useWorkspaceContext();
    const [shellOptions, setShellOptions] = useState<WorkspaceShellOptions>({
        defaultCursor: 'default',
        className: '',
    });

    useLayoutEffect(() => {
        if (!containerRef.current) return;

        let cursor = shellOptions.defaultCursor ?? 'default';
        if (isCanvasPanning) cursor = 'grabbing';
        else if (isPanModeActive) cursor = 'grab';

        containerRef.current.style.cursor = cursor;
    }, [containerRef, isCanvasPanning, isPanModeActive, shellOptions.defaultCursor]);

    const handleWheel = useCallback((event: WheelEvent<HTMLElement>) => {
        shellOptions.onWheel?.(event);
    }, [shellOptions]);

    return (
        <WorkspaceShellProvider setShellOptions={setShellOptions}>
            <main
                ref={containerRef}
                onWheel={handleWheel}
                className={`relative h-full min-h-0 w-full overflow-hidden ${shellOptions.className ?? ''}`.trim()}
            >
                {children}
                {shellOptions.badge != null && <FloatingInfoBadge>{shellOptions.badge}</FloatingInfoBadge>}
            </main>
        </WorkspaceShellProvider>
    );
}

export default function WorkspaceRouteShell({ children, isAuthenticated }: WorkspaceRouteLayoutProps) {
    return (
        <ClientShell isAuthenticated={isAuthenticated}>
            <WorkspaceProvider>
                <WorkspaceShell>{children}</WorkspaceShell>
            </WorkspaceProvider>
        </ClientShell>
    );
}
