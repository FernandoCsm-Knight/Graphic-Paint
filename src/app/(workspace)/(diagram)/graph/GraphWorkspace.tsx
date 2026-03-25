'use client';

import { useEffect, useMemo, useRef } from 'react';
import SimulationPlayer from '@/components/SimulationPlayer';
import WorkspaceToolButton from '@/components/WorkspaceToolButton';
import { useDiagramWorkspace } from '@/context/DiagramWorkspaceContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';
import GraphMenu from '@/app/(workspace)/(diagram)/graph/_components/GraphMenu';
import LabelEditor from '@/app/(workspace)/(diagram)/graph/_components/LabelEditor';
import { useGraphContext } from '@/app/(workspace)/(diagram)/graph/_context/GraphContext';
import { useAlgorithmPlayer } from '@/app/(workspace)/(diagram)/graph/_hooks/useAlgorithmPlayer';
import { useGraphD3 } from '@/app/(workspace)/(diagram)/graph/_hooks/useGraphD3';
import type { AlgorithmId, AlgorithmStep, GraphEdge, GraphNode } from '@/app/(workspace)/(diagram)/graph/_types/graph';
import type { GraphProjectSnapshot } from '@/lib/workspace/projectPersistence.schemas';
import { LuSquareDashedMousePointer } from 'react-icons/lu';

type GraphWorkspaceProps = {
    projectId?: string;
    initialSnapshot?: GraphProjectSnapshot;
};

async function computeAlgorithmSteps(
    algorithm: AlgorithmId,
    nodeList: GraphNode[],
    edgeList: GraphEdge[],
    startNodeId: string | null,
    endNodeId: string | null,
    directed: boolean,
): Promise<AlgorithmStep[]> {
    switch (algorithm) {
        case 'bfs':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/BFS')).runBFS(nodeList, edgeList, startNodeId!, directed);
        case 'dfs':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/DFS')).runDFS(nodeList, edgeList, startNodeId!, directed);
        case 'dijkstra':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/Dijkstra')).runDijkstra(nodeList, edgeList, startNodeId!, endNodeId!, directed);
        case 'prim':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/Prim')).runPrim(nodeList, edgeList, startNodeId!);
        case 'kruskal':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/Kruskal')).runKruskal(nodeList, edgeList);
        case 'topo':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/TopologicalSort')).runTopologicalSort(nodeList, edgeList);
        case 'cpm':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/CriticalPath')).runCriticalPath(nodeList, edgeList);
        case 'bridges':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/Bridges')).runBridges(nodeList, edgeList);
        case 'tarjan':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/TarjanSCC')).runTarjanSCC(nodeList, edgeList);
        case 'kosaraju':
            return (await import('@/app/(workspace)/(diagram)/graph/_algorithms/KosarajuBase')).runKosarajuBase(nodeList, edgeList);
    }
}

export default function GraphWorkspace({ projectId, initialSnapshot }: GraphWorkspaceProps) {
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

    const {
        svgRef,
        viewportSize,
        viewOffset,
        zoom,
        isPanModeActiveRef,
        isPanningRef,
    } = useDiagramWorkspace();

    const {
        setViewOffset,
        setZoom,
        setWorldSize,
        worldSize,
    } = useWorkspaceContext();

    const hydratedRef = useRef(false);
    const lastSavedPayloadRef = useRef<string | null>(null);

    useGraphD3(svgRef, state, dispatch, { viewOffset, zoom, viewportSize }, { isPanModeActiveRef, isPanningRef });
    useAlgorithmPlayer(state, dispatch);

    const nodeList = useMemo(() => Object.values(state.nodes), [state.nodes]);
    const edgeList = useMemo(() => Object.values(state.edges), [state.edges]);

    const persistedSnapshot = useMemo<GraphProjectSnapshot>(() => ({
        directed: state.directed,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        canvasWidth: worldSize.width,
        canvasHeight: worldSize.height,
        viewOffset,
        zoom,
        nodes: [...nodeList]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((node) => ({
                id: node.id,
                x: node.x,
                y: node.y,
                label: node.label,
            })),
        edges: [...edgeList]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                weight: edge.weight,
            })),
    }), [edgeList, nodeList, state.directed, state.gridSize, state.snapToGrid, viewOffset, worldSize.height, worldSize.width, zoom]);

    const needsStart = algorithm === 'bfs' || algorithm === 'dfs' || algorithm === 'dijkstra' || algorithm === 'prim';
    const needsEnd = algorithm === 'dijkstra';

    useEffect(() => {
        if (!initialSnapshot || hydratedRef.current) return;

        dispatch({
            type: 'HYDRATE_GRAPH',
            state: {
                nodes: Object.fromEntries(initialSnapshot.nodes.map((node) => [node.id, node])),
                edges: Object.fromEntries(initialSnapshot.edges.map((edge) => [edge.id, edge])),
                directed: initialSnapshot.directed,
                snapToGrid: initialSnapshot.snapToGrid,
                gridSize: initialSnapshot.gridSize,
            },
        });
        setWorldSize({
            width: Math.max(2400, Math.ceil(initialSnapshot.canvasWidth)),
            height: Math.max(1600, Math.ceil(initialSnapshot.canvasHeight)),
        });
        setViewOffset(initialSnapshot.viewOffset);
        setZoom(initialSnapshot.zoom);
        lastSavedPayloadRef.current = JSON.stringify(initialSnapshot);
        hydratedRef.current = true;
    }, [dispatch, initialSnapshot, setViewOffset, setWorldSize, setZoom]);

    useEffect(() => {
        const directedOnly = algorithm === 'topo' || algorithm === 'cpm' || algorithm === 'tarjan' || algorithm === 'kosaraju';
        const undirectedOnly = algorithm === 'prim' || algorithm === 'kruskal' || algorithm === 'bridges';
        if (state.directed && undirectedOnly) dispatch({ type: 'SET_ALGORITHM', algorithm: 'dfs' });
        if (!state.directed && directedOnly) dispatch({ type: 'SET_ALGORITHM', algorithm: 'dfs' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.directed]);

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

        let cancelled = false;

        void computeAlgorithmSteps(algorithm, nodeList, edgeList, startNodeId, endNodeId, state.directed).then((steps) => {
            if (!cancelled) {
                dispatch({ type: 'SET_ALGORITHM_STEPS', steps });
            }
        });

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeList, edgeList, startNodeId, endNodeId, algorithm, showSimulation, state.directed]);

    useEffect(() => {
        if (!projectId) return;

        const nextPayload = JSON.stringify(persistedSnapshot);
        if (nextPayload === lastSavedPayloadRef.current) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void fetch(`/api/projects/graph/${projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                },
                body: nextPayload,
            }).then((response) => {
                if (response.ok) {
                    lastSavedPayloadRef.current = nextPayload;
                }
            }).catch(() => {
                // Preserve local state; the next change will attempt another save.
            });
        }, 700);

        return () => window.clearTimeout(timeoutId);
    }, [persistedSnapshot, projectId]);

    return (
        <>
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
                        <div className="flex flex-col gap-(var(--pm-gap))">
                            <div className="flex flex-col gap-1">
                                <span className="ui-panel-muted text-xs uppercase tracking-[0.18em]">
                                    Algoritmo
                                </span>
                                <select
                                    value={algorithm}
                                    onChange={(event) =>
                                        dispatch({
                                            type: 'SET_ALGORITHM',
                                            algorithm: event.target.value as AlgorithmId,
                                        })
                                    }
                                    onKeyDown={(event) => event.stopPropagation()}
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

                            {needsStart && (
                                <div className={`grid gap-(var(--pm-gap)) ${needsEnd ? 'grid-cols-2' : 'grid-cols-1'}`}>
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

            <LabelEditor svgRef={svgRef} />
        </>
    );
}
