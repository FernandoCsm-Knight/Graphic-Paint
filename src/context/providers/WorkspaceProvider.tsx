'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { WorkspaceContext } from '../WorkspaceContext';

const DEFAULT_WORLD_SIZE = { width: 2400, height: 1600 };

const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const containerRef = useRef<HTMLElement | null>(null);
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [worldSize, setWorldSize] = useState(DEFAULT_WORLD_SIZE);
    const [isPanModeActive, setPanModeActive] = useState(false);
    const [isCanvasPanning, setCanvasPanning] = useState(false);

    const value = useMemo(() => ({
        containerRef,
        viewOffset,
        setViewOffset,
        zoom,
        setZoom,
        worldSize,
        setWorldSize,
        isPanModeActive,
        setPanModeActive,
        isCanvasPanning,
        setCanvasPanning,
    }), [viewOffset, zoom, worldSize, isPanModeActive, isCanvasPanning]);

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export default WorkspaceProvider;
