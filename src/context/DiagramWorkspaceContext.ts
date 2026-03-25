'use client';

import { createContext, useContext } from 'react';
import type {
    RefObject,
} from 'react';
import type { PointerEvent } from 'react';

export type DiagramWorkspaceOptions = {
    gridSize?: number;
    menuSelector?: string;
    svgClassName?: string;
};

export type DiagramWorkspaceSurface = {
    svgRef: RefObject<SVGSVGElement | null>;
    viewportSize: { width: number; height: number };
    viewOffset: { x: number; y: number };
    zoom: number;
    isPanModeActiveRef: RefObject<boolean>;
    isPanningRef: RefObject<boolean>;
    onPointerDown: (event: PointerEvent<Element>) => boolean;
    onPointerMove: (event: PointerEvent<Element>) => boolean;
    onPointerUp: (event?: PointerEvent<Element>) => boolean;
};

export const DiagramWorkspaceSurfaceContext = createContext<DiagramWorkspaceSurface | null>(null);

export function useDiagramWorkspace(): DiagramWorkspaceSurface {
    const surfaceContext = useContext(DiagramWorkspaceSurfaceContext);

    if (!surfaceContext) {
        throw new Error('useDiagramWorkspace must be used within DiagramWorkspaceSurfaceProvider');
    }

    return surfaceContext;
}
