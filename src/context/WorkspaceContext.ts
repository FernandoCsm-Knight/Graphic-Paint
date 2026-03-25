import { createContext, useContext } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Point } from '../types/geometry';

type WorldSize = { width: number; height: number };

export type WorkspaceContextValue = {
    containerRef: RefObject<HTMLElement | null>;
    viewOffset: Point;
    setViewOffset: Dispatch<SetStateAction<Point>>;
    zoom: number;
    setZoom: (value: number) => void;
    isPanModeActive: boolean;
    setPanModeActive: (value: boolean) => void;
    isCanvasPanning: boolean;
    setCanvasPanning: (value: boolean) => void;
    worldSize: WorldSize;
    setWorldSize: Dispatch<SetStateAction<WorldSize>>;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceContext(): WorkspaceContextValue {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
    return ctx;
}
