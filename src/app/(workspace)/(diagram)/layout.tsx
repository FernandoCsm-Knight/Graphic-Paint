'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useWorkspaceContext } from '@/context/WorkspaceContext';
import {
    type DiagramWorkspaceOptions,
} from '@/context/DiagramWorkspaceContext';
import {
    DiagramWorkspaceSurfaceProvider,
} from '@/context/providers/DiagramWorkspaceProvider';
import { useWorkspaceShell, type WorkspaceShellOptions } from '@/context/WorkspaceShellContext';
import useWorkspacePanZoom from '@/hooks/useWorkspacePanZoom';
import useWorkspaceViewport from '@/hooks/useWorkspaceViewport';
import { STANDARD_GRID_SIZE } from '@/utils/workspaceGrid';

type DiagramRouteLayoutProps = {
    children: ReactNode;
};

export default function DiagramRouteLayout({ children }: DiagramRouteLayoutProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const isPanModeActiveRef = useRef(false);
    const isPanningRef = useRef(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const segment = useSelectedLayoutSegment();

    const {
        containerRef,
        viewOffset,
        setViewOffset,
        zoom,
        setZoom,
        worldSize,
        setWorldSize,
        isPanModeActive,
        setCanvasPanning,
    } = useWorkspaceContext();

    const diagramOptions = useMemo<DiagramWorkspaceOptions>(() => {
        switch (segment) {
            case 'graph':
                return {
                    menuSelector: '[data-graph-menu]',
                    svgClassName: 'graph-svg',
                };
            case 'automaton':
                return {
                    menuSelector: '[data-automaton-menu]',
                    svgClassName: 'automaton-svg',
                };
            default:
                return {};
        }
    }, [segment]);

    const {
        gridSize = STANDARD_GRID_SIZE,
        menuSelector = '',
        svgClassName = 'diagram-svg',
    } = diagramOptions;

    useEffect(() => {
        isPanModeActiveRef.current = isPanModeActive;
    }, [isPanModeActive]);

    const getWorldSize = useCallback(() => worldSize, [worldSize]);
    const { getViewportSize, clampViewOffset, getMinAllowedZoom } = useWorkspaceViewport({
        containerRef,
        zoom,
        getWorldSize,
    });

    const { onPointerDown, onPointerMove, onPointerUp, handleWheel } = useWorkspacePanZoom({
        interactionRef: svgRef,
        containerRef,
        viewOffset,
        setViewOffset,
        zoom,
        setZoom,
        worldSize,
        setWorldSize,
        setIsPanning: (value: boolean) => {
            isPanningRef.current = value;
            setCanvasPanning(value);
        },
        isPanModeActive,
        getViewportSize,
        clampViewOffset,
        getMinAllowedZoom,
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const MIN_WORLD_WIDTH = 2400;
        const MIN_WORLD_HEIGHT = 1600;
        const WORLD_SCALE_FACTOR = 2;

        const syncWorkspaceBounds = () => {
            const viewportWidth = Math.max(1, Math.floor(container.clientWidth));
            const viewportHeight = Math.max(1, Math.floor(container.clientHeight));
            const nextWorldWidth = Math.max(MIN_WORLD_WIDTH, worldSize.width, Math.ceil(viewportWidth * WORLD_SCALE_FACTOR));
            const nextWorldHeight = Math.max(MIN_WORLD_HEIGHT, worldSize.height, Math.ceil(viewportHeight * WORLD_SCALE_FACTOR));

            setViewportSize((previous) =>
                previous.width === viewportWidth && previous.height === viewportHeight
                    ? previous
                    : { width: viewportWidth, height: viewportHeight }
            );

            if (nextWorldWidth !== worldSize.width || nextWorldHeight !== worldSize.height) {
                setWorldSize((previous) => ({
                    width: Math.max(previous.width, nextWorldWidth),
                    height: Math.max(previous.height, nextWorldHeight),
                }));
            }

            setViewOffset((previous) => {
                const next = clampViewOffset(
                    previous,
                    viewportWidth,
                    viewportHeight,
                    nextWorldWidth,
                    nextWorldHeight,
                );
                return next.x === previous.x && next.y === previous.y ? previous : next;
            });
        };

        syncWorkspaceBounds();
        const observer = new ResizeObserver(() => syncWorkspaceBounds());
        observer.observe(container);

        return () => observer.disconnect();
    }, [clampViewOffset, containerRef, setViewOffset, setWorldSize, worldSize.height, worldSize.width]);

    const badge = `${viewportSize.width} x ${viewportSize.height} · ${Math.round(zoom * 100)}%`;
    const gridCellSize = Math.max(1, gridSize * zoom);
    const gridOffsetX = ((viewOffset.x % gridCellSize) + gridCellSize) % gridCellSize;
    const gridOffsetY = ((viewOffset.y % gridCellSize) + gridCellSize) % gridCellSize;

    const shellOptions = useMemo<WorkspaceShellOptions>(() => ({
        onWheel: (event) => {
            if (menuSelector && (event.target as HTMLElement).closest(menuSelector)) return;
            handleWheel(event);
        },
        badge,
    }), [badge, handleWheel, menuSelector]);

    useWorkspaceShell(shellOptions);

    const surface = useMemo(() => ({
        svgRef,
        viewportSize,
        viewOffset,
        zoom,
        isPanModeActiveRef,
        isPanningRef,
        onPointerDown,
        onPointerMove,
        onPointerUp,
    }), [onPointerDown, onPointerMove, onPointerUp, viewOffset, viewportSize, zoom]);

    return (
        <DiagramWorkspaceSurfaceProvider value={surface}>
            <div className="absolute inset-0 overflow-hidden">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, var(--workspace-grid-line) 1px, transparent 1px),
                            linear-gradient(to bottom, var(--workspace-grid-line) 1px, transparent 1px)
                        `,
                        backgroundSize: `${gridCellSize}px ${gridCellSize}px`,
                        backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
                    }}
                />
                <svg
                    ref={svgRef}
                    className={`${svgClassName} absolute inset-0 block h-full w-full touch-none select-none`}
                    onMouseDown={(event) => {
                        if (event.button === 1) event.preventDefault();
                    }}
                    onPointerDownCapture={(event: PointerEvent<SVGSVGElement>) => {
                        if (onPointerDown(event)) event.stopPropagation();
                    }}
                    onPointerMoveCapture={(event: PointerEvent<SVGSVGElement>) => {
                        if (onPointerMove(event)) event.stopPropagation();
                    }}
                    onPointerUpCapture={(event: PointerEvent<SVGSVGElement>) => {
                        if (onPointerUp(event)) event.stopPropagation();
                    }}
                    onPointerCancelCapture={(event: PointerEvent<SVGSVGElement>) => {
                        if (onPointerUp(event)) event.stopPropagation();
                    }}
                />
            </div>
            {children}
        </DiagramWorkspaceSurfaceProvider>
    );
}
