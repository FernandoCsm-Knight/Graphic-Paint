import { useCallback, useEffect, useRef, useState } from 'react';
import { LuSquareDashedMousePointer } from 'react-icons/lu';
import useWorkspacePanZoom from '../../hooks/useWorkspacePanZoom';
import useWorkspaceViewport from '../../hooks/useWorkspaceViewport';
import { useWorkspaceContext } from '../../context/WorkspaceContext';
import { useGraphContext } from './context/GraphContext';
import { useGraphD3 } from './hooks/useGraphD3';
import { useAlgorithmPlayer } from './hooks/useAlgorithmPlayer';
import { runBFS } from './algorithms/BFS';
import { runDFS } from './algorithms/DFS';
import { runDijkstra } from './algorithms/Dijkstra';
import { runPrim } from './algorithms/Prim';
import { runKruskal } from './algorithms/Kruskal';
import { runTopologicalSort } from './algorithms/TopologicalSort';
import { runCriticalPath } from './algorithms/CriticalPath';
import { runBridges } from './algorithms/Bridges';
import { runTarjanSCC } from './algorithms/TarjanSCC';
import { runKosarajuBase } from './algorithms/KosarajuBase';
import type { AlgorithmId } from './types/graph';
import GraphMenu from './components/GraphMenu';
import LabelEditor from './components/LabelEditor';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import SimulationPlayer from '../../components/SimulationPlayer';
import WorkspaceToolButton from '../../components/WorkspaceToolButton';

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
    const {
        nodes,
        algorithm,
        startNodeId,
        endNodeId,
        selectingFor,
        showSimulation,
        algorithmSteps,
        currentStepIndex,
        isPlaying,
        stepIntervalMs,
    } = state;

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

    // ── Stable keys for graph structure ──────────────────────────────────────
    const nodesKey = Object.values(state.nodes).map((n) => n.id).sort().join('|');
    const edgesKey = Object.values(state.edges)
        .map((e) => `${e.source}-${e.target}-${e.weight}`)
        .sort()
        .join('|');

    // Algorithms that require a start node
    const needsStart = algorithm === 'bfs' || algorithm === 'dfs' || algorithm === 'dijkstra' || algorithm === 'prim';
    const needsEnd   = algorithm === 'dijkstra';

    // ── Reset algorithm when graph type changes and selected algo no longer applies ──
    useEffect(() => {
        const directedOnly = algorithm === 'topo' || algorithm === 'cpm' || algorithm === 'tarjan' || algorithm === 'kosaraju';
        const undirectedOnly = algorithm === 'prim' || algorithm === 'kruskal' || algorithm === 'bridges';
        if (state.directed && undirectedOnly) dispatch({ type: 'SET_ALGORITHM', algorithm: 'dfs' });
        if (!state.directed && directedOnly) dispatch({ type: 'SET_ALGORITHM', algorithm: 'dfs' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.directed]);

    // ── Auto-compute algorithm steps ──────────────────────────────────────────
    useEffect(() => {
        if (!showSimulation) {
            dispatch({ type: 'SET_ALGORITHM_STEPS', steps: [] });
            return;
        }
        if (needsStart && !startNodeId) {
            dispatch({ type: 'SET_ALGORITHM_STEPS', steps: [] });
            return;
        }
        if (needsEnd && !endNodeId) {
            dispatch({ type: 'SET_ALGORITHM_STEPS', steps: [] });
            return;
        }
        const n = Object.values(state.nodes);
        const e = Object.values(state.edges);
        const steps =
            algorithm === 'bfs'     ? runBFS(n, e, startNodeId!, state.directed) :
            algorithm === 'dfs'     ? runDFS(n, e, startNodeId!, state.directed) :
            algorithm === 'dijkstra'? runDijkstra(n, e, startNodeId!, endNodeId!, state.directed) :
            algorithm === 'prim'    ? runPrim(n, e, startNodeId!) :
            algorithm === 'kruskal' ? runKruskal(n, e) :
            algorithm === 'topo'    ? runTopologicalSort(n, e) :
            algorithm === 'cpm'     ? runCriticalPath(n, e) :
            algorithm === 'bridges'  ? runBridges(n, e) :
            algorithm === 'tarjan'   ? runTarjanSCC(n, e) :
            runKosarajuBase(n, e);
        dispatch({ type: 'SET_ALGORITHM_STEPS', steps });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesKey, edgesKey, startNodeId, endNodeId, algorithm, showSimulation, state.directed]);

    // ── Viewport sync ─────────────────────────────────────────────────────────
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

            {showSimulation && (
                <div data-graph-menu>
                    <SimulationPlayer
                        steps={algorithmSteps.length}
                        currentStep={currentStepIndex}
                        isPlaying={isPlaying}
                        intervalMs={stepIntervalMs}
                        message={algorithmSteps[currentStepIndex]?.message}
                        onPlay={() => dispatch({ type: 'SET_PLAYING', value: true })}
                        onPause={() => dispatch({ type: 'SET_PLAYING', value: false })}
                        onPrev={() => dispatch({ type: 'STEP_BACKWARD' })}
                        onNext={() => dispatch({ type: 'STEP_FORWARD' })}
                        onIntervalChange={(ms) => dispatch({ type: 'SET_STEP_INTERVAL', ms })}
                        onClose={() => dispatch({ type: 'SET_SHOW_SIMULATION', value: false })}
                        initialPosition={() => ({ x: Math.max(0, window.innerWidth - 340), y: 24 })}
                    >
                        <div className="flex flex-col gap-[var(--pm-gap)]">
                            {/* Algorithm selector */}
                            <div className="flex flex-col gap-1">
                                <span className="ui-panel-muted text-xs uppercase tracking-[0.18em]">
                                    Algoritmo
                                </span>
                                <select
                                    value={algorithm}
                                    onChange={(e) =>
                                        dispatch({
                                            type: 'SET_ALGORITHM',
                                            algorithm: e.target.value as AlgorithmId,
                                        })
                                    }
                                    onKeyDown={(e) => e.stopPropagation()}
                                    className="ui-input rounded-lg px-2 py-1.5 text-sm w-full cursor-pointer"
                                >
                                    <optgroup label="Travessia">
                                        <option value="dfs">DFS — Busca em Profundidade</option>
                                        <option value="bfs">BFS — Busca em Largura</option>
                                    </optgroup>
                                    <optgroup label="Caminho Mínimo">
                                        <option value="dijkstra">Dijkstra</option>
                                    </optgroup>
                                    {!state.directed && (
                                        <optgroup label="Árvore Geradora Mínima">
                                            <option value="prim">Prim</option>
                                            <option value="kruskal">Kruskal (Union-Find)</option>
                                        </optgroup>
                                    )}
                                    {state.directed && (
                                        <optgroup label="DAG">
                                            <option value="topo">Ordenação Topológica</option>
                                            <option value="cpm">Caminho Crítico (CPM)</option>
                                        </optgroup>
                                    )}
                                    {!state.directed && (
                                        <optgroup label="Conectividade">
                                            <option value="bridges">Pontes</option>
                                        </optgroup>
                                    )}
                                    {state.directed && (
                                        <optgroup label="Conectividade">
                                            <option value="tarjan">Tarjan — SCCs</option>
                                            <option value="kosaraju">Kosaraju — Base</option>
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            {/* Node selection buttons — only for algorithms that need a start node */}
                            {needsStart && (
                                <div className={`grid gap-[var(--pm-gap)] ${needsEnd ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    <WorkspaceToolButton
                                        ariaLabel="Selecionar vértice inicial"
                                        title="Clique para selecionar vértice inicial"
                                        stayActive
                                        active={selectingFor === 'startNode'}
                                        onClick={() =>
                                            dispatch({
                                                type: 'SET_SELECTING_FOR',
                                                target: selectingFor === 'startNode' ? 'none' : 'startNode',
                                            })
                                        }
                                        className="flex items-center justify-center gap-1.5 px-2"
                                    >
                                        <LuSquareDashedMousePointer className="workspace-icon" />
                                        <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                            {startNodeId ? `S: ${nodes[startNodeId]?.label ?? '?'}` : 'Início'}
                                        </span>
                                    </WorkspaceToolButton>

                                    {needsEnd && (
                                        <WorkspaceToolButton
                                            ariaLabel="Selecionar vértice final"
                                            title="Clique para selecionar vértice final"
                                            stayActive
                                            active={selectingFor === 'endNode'}
                                            onClick={() =>
                                                dispatch({
                                                    type: 'SET_SELECTING_FOR',
                                                    target: selectingFor === 'endNode' ? 'none' : 'endNode',
                                                })
                                            }
                                            className="flex items-center justify-center gap-1.5 px-2"
                                        >
                                            <LuSquareDashedMousePointer className="workspace-icon" />
                                            <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                                {endNodeId ? `E: ${nodes[endNodeId]?.label ?? '?'}` : 'Fim'}
                                            </span>
                                        </WorkspaceToolButton>
                                    )}
                                </div>
                            )}

                            {/* Interaction hint for node selection */}
                            {selectingFor !== 'none' && (
                                <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                                    {selectingFor === 'startNode'
                                        ? 'Clique em um vértice para definir o início'
                                        : 'Clique em um vértice para definir o fim'}
                                </div>
                            )}
                        </div>
                    </SimulationPlayer>
                </div>
            )}

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
