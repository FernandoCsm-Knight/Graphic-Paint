'use client';

import { useMemo } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { WorkspaceShellContext, type WorkspaceShellOptions } from '../WorkspaceShellContext';

type WorkspaceShellProviderProps = {
    children: ReactNode;
    setShellOptions: Dispatch<SetStateAction<WorkspaceShellOptions>>;
};

export default function WorkspaceShellProvider({
    children,
    setShellOptions,
}: WorkspaceShellProviderProps) {
    const value = useMemo(() => ({ setShellOptions }), [setShellOptions]);

    return (
        <WorkspaceShellContext.Provider value={value}>
            {children}
        </WorkspaceShellContext.Provider>
    );
}
