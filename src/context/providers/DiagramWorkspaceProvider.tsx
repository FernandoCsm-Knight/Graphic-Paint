'use client';

import type { ReactNode } from 'react';
import {
    DiagramWorkspaceSurfaceContext,
    type DiagramWorkspaceSurface,
} from '../DiagramWorkspaceContext';

type DiagramWorkspaceSurfaceProviderProps = {
    children: ReactNode;
    value: DiagramWorkspaceSurface;
};

export function DiagramWorkspaceSurfaceProvider({
    children,
    value,
}: DiagramWorkspaceSurfaceProviderProps) {
    return (
        <DiagramWorkspaceSurfaceContext.Provider value={value}>
            {children}
        </DiagramWorkspaceSurfaceContext.Provider>
    );
}
