import { useCallback, useEffect, useRef, useState } from 'react';
import useWorkspacePanZoom from '../../hooks/useWorkspacePanZoom';
import useWorkspaceViewport from '../../hooks/useWorkspaceViewport';
import { useWorkspaceContext } from '../../context/WorkspaceContext';
import { useGraphContext } from './context/GraphContext';
import { useGraphD3 } from './hooks/useGraphD3';
import { useAlgorithmPlayer } from './hooks/useAlgorithmPlayer';
import GraphMenu from './components/GraphMenu';
import GraphPlayerCard from './components/GraphPlayerCard';
import LabelEditor from './components/LabelEditor';
import WorkspaceLayout from '../../components/WorkspaceLayout';

const GraphWorkspace = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const isPanModeActiveRef = useRef(false);
    const isPanningRef = useRef(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

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

    isPanModeActiveRef.current = isPanModeActive;

    const { state, dispatch } = useGraphContext();

    const gridCellSize = Math.max(1, state.gridSize * zoom);
    const gridOffsetX = ((viewOffset.x % gridCellSize) + gridCellSize) % gridCellSize;
    const gridOffsetY = ((viewOffset.y % gridCellSize) + gridCellSize) % gridCellSize;

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
        setIsPanning: (value) => { isPanningRef.current = value; setCanvasPanning(value); },
        isPanModeActive,
        getViewportSize,
        clampViewOffset,
        getMinAllowedZoom,
    });

    useGraphD3(svgRef, state, dispatch, { viewOffset, zoom, viewportSize }, { isPanModeActiveRef, isPanningRef });
    useAlgorithmPlayer(state, dispatch);

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

            setViewportSize((previous) => (
                previous.width === viewportWidth && previous.height === viewportHeight
                    ? previous
                    : { width: viewportWidth, height: viewportHeight }
            ));

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
                    nextWorldHeight
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

    return (
        <WorkspaceLayout
            onWheel={(event) => {
                if ((event.target as HTMLElement).closest('[data-graph-menu]')) return;
                handleWheel(event);
            }}
            badge={badge}
        >
            <div data-graph-menu>
                <GraphMenu />
            </div>
            <div data-graph-menu>
                <GraphPlayerCard />
            </div>

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
                    className="graph-svg absolute inset-0 block h-full w-full touch-none select-none"
                    onMouseDown={(event) => {
                        if (event.button === 1) event.preventDefault();
                    }}
                    onPointerDownCapture={(event) => {
                        if (onPointerDown(event)) event.stopPropagation();
                    }}
                    onPointerMoveCapture={(event) => {
                        if (onPointerMove(event)) event.stopPropagation();
                    }}
                    onPointerUpCapture={(event) => {
                        if (onPointerUp(event)) event.stopPropagation();
                    }}
                    onPointerCancelCapture={(event) => {
                        if (onPointerUp(event)) event.stopPropagation();
                    }}
                />
                <LabelEditor svgRef={svgRef} />
            </div>
        </WorkspaceLayout>
    );
};

export default GraphWorkspace;
