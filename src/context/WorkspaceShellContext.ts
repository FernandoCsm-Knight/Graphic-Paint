'use client';

import { createContext, useContext, useLayoutEffect } from 'react';
import type { Dispatch, ReactNode, SetStateAction, WheelEvent } from 'react';

export type WorkspaceShellOptions = {
    badge?: ReactNode;
    defaultCursor?: string;
    onWheel?: (event: WheelEvent<HTMLElement>) => void;
    className?: string;
};

type WorkspaceShellContextValue = {
    setShellOptions: Dispatch<SetStateAction<WorkspaceShellOptions>>;
};

export const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(null);

export function useWorkspaceShell({
    badge,
    defaultCursor = 'default',
    onWheel,
    className = '',
}: WorkspaceShellOptions) {
    const context = useContext(WorkspaceShellContext);

    if (!context) {
        throw new Error('useWorkspaceShell must be used within WorkspaceShellProvider');
    }

    const { setShellOptions } = context;

    useLayoutEffect(() => {
        setShellOptions((previous) => {
            if (
                previous.badge === badge &&
                previous.defaultCursor === defaultCursor &&
                previous.onWheel === onWheel &&
                previous.className === className
            ) {
                return previous;
            }

            return {
                badge,
                defaultCursor,
                onWheel,
                className,
            };
        });

        return () => {
            setShellOptions((previous) => {
                if (
                    previous.badge === undefined &&
                    previous.defaultCursor === 'default' &&
                    previous.onWheel === undefined &&
                    previous.className === ''
                ) {
                    return previous;
                }

                return {
                    badge: undefined,
                    defaultCursor: 'default',
                    onWheel: undefined,
                    className: '',
                };
            });
        };
    }, [badge, className, defaultCursor, onWheel, setShellOptions]);
}
