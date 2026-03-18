import {
    LuHand,
    LuCircleDot,
    LuDownload,
    LuGrid2X2,
    LuPlay,
    LuSquareDashedMousePointer,
    LuTrash2,
} from 'react-icons/lu';
import GlassCard from '../../../components/GlassCard';
import WorkspaceToolButton from '../../../components/WorkspaceToolButton';
import MenuTitleCard from '../../../components/MenuTitleCard';
import { useGraphContext } from '../context/GraphContext';
import { useWorkspaceContext } from '../../../context/WorkspaceContext';
import type { AlgorithmId } from '../types/graph';
import { useState } from 'react';

const ALGORITHMS: { id: AlgorithmId; label: string }[] = [
    { id: 'none', label: 'Nenhum' },
    { id: 'bfs', label: 'BFS' },
    { id: 'dfs', label: 'DFS' },
    { id: 'dijkstra', label: 'Dijkstra' },
];

const GraphMenu = () => {
    const { state, dispatch } = useGraphContext();
    const { isPanModeActive, setPanModeActive } = useWorkspaceContext();
    const [showHelp, setShowHelp] = useState(false);
    const {
        directed,
        snapToGrid,
        algorithm,
        selectingFor,
        startNodeId,
        endNodeId,
        nodes,
        edgeSourceId,
    } = state;

    const nodeCount = Object.keys(nodes).length;
    const needsStart = algorithm !== 'none';
    const needsEnd = algorithm === 'dijkstra';

    const handleRun = () => {
        if (algorithm === 'none') return;
        if (!startNodeId) {
            dispatch({ type: 'SET_SELECTING_FOR', target: 'startNode' });
        } else if (needsEnd && !endNodeId) {
            dispatch({ type: 'SET_SELECTING_FOR', target: 'endNode' });
        } else {
            // Placeholder: algorithms not yet implemented
            // dispatch({ type: 'SET_ALGORITHM_STEPS', steps: runAlgorithm(...) });
            alert('Algoritmos serão implementados em breve!');
        }
    };

    const handleExport = () => {
        const svg = document.querySelector<SVGSVGElement>('.graph-svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph.svg';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleHelp = () => setShowHelp(!showHelp);

    return (
        <GlassCard initial={() => ({ x: 24, y: 24 })} className="workspace-menu-shell">
            <div className="relative min-w-52 md:min-w-72 flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)]">

                {/* Header */}
                <MenuTitleCard
                    title="Graph"
                    subtitle={`${nodeCount} ${nodeCount === 1 ? 'vértice' : 'vértices'} · ${Object.keys(state.edges).length} ${Object.keys(state.edges).length === 1 ? 'aresta' : 'arestas'}`}
                    badge={directed ? 'Digrafo' : 'Grafo'}
                    segments={[
                        { label: 'Grafo', active: !directed, onClick: () => dispatch({ type: 'SET_DIRECTED', value: false }) },
                        { label: 'Digrafo', active: directed, onClick: () => dispatch({ type: 'SET_DIRECTED', value: true }) },
                    ]}
                />

                {/* Interaction hint */}
                {edgeSourceId && (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        Clique direito em outro vértice para criar aresta
                    </div>
                )}
                {selectingFor === 'startNode' && (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        Clique em um vértice para definir o início
                    </div>
                )}
                {selectingFor === 'endNode' && (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        Clique em um vértice para definir o fim
                    </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-[var(--pm-gap)]">
                    <WorkspaceToolButton
                        ariaLabel="Mover viewport"
                        title={isPanModeActive ? 'Desativar pan' : 'Ativar pan'}
                        stayActive
                        active={isPanModeActive}
                        onClick={() => setPanModeActive(!isPanModeActive)}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuHand className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Pan
                        </span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Snap to grid"
                        title={snapToGrid ? 'Desativar snap' : 'Ativar snap'}
                        stayActive
                        active={snapToGrid}
                        onClick={() => dispatch({ type: 'SET_SNAP_TO_GRID', value: !snapToGrid })}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuGrid2X2 className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Snap
                        </span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Limpar grafo"
                        title="Limpar grafo"
                        onClick={() => {
                            if (
                                Object.keys(nodes).length === 0 ||
                                window.confirm('Limpar o grafo?')
                            ) {
                                dispatch({ type: 'CLEAR_GRAPH' });
                            }
                        }}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuTrash2 className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Limpar
                        </span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Exportar SVG"
                        title="Exportar como SVG"
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuDownload className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Exportar
                        </span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Dica de uso"
                        title="Como usar"
                        onClick={handleHelp}
                        stayActive
                        active={showHelp}
                        className="flex items-center justify-center gap-2 px-3 col-span-2"
                    >
                        <LuCircleDot className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Ajuda
                        </span>
                    </WorkspaceToolButton>
                </div>

                {/* Separator */}
                <div className="ui-drag-line rounded border" />

                {/* Algorithm section */}
                <div className="flex flex-col gap-[var(--pm-gap)]">
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
                        className="ui-input rounded-lg px-3 py-[var(--pm-btn-pad)] text-xs font-semibold cursor-pointer"
                    >
                        {ALGORITHMS.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.label}
                            </option>
                        ))}
                    </select>

                    {needsStart && (
                        <div className="grid grid-cols-2 gap-[var(--pm-gap)]">
                            <WorkspaceToolButton
                                ariaLabel="Selecionar nó inicial"
                                title="Clique para selecionar nó inicial"
                                stayActive
                                active={selectingFor === 'startNode'}
                                onClick={() =>
                                    dispatch({
                                        type: 'SET_SELECTING_FOR',
                                        target:
                                            selectingFor === 'startNode' ? 'none' : 'startNode',
                                    })
                                }
                                className="flex items-center justify-center gap-1.5 px-2"
                            >
                                <LuSquareDashedMousePointer className="workspace-icon" />
                                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                    {startNodeId
                                        ? `S: ${state.nodes[startNodeId]?.label ?? '?'}`
                                        : 'Início'}
                                </span>
                            </WorkspaceToolButton>

                            {needsEnd && (
                                <WorkspaceToolButton
                                    ariaLabel="Selecionar nó final"
                                    title="Clique para selecionar nó final"
                                    stayActive
                                    active={selectingFor === 'endNode'}
                                    onClick={() =>
                                        dispatch({
                                            type: 'SET_SELECTING_FOR',
                                            target:
                                                selectingFor === 'endNode' ? 'none' : 'endNode',
                                        })
                                    }
                                    className="flex items-center justify-center gap-1.5 px-2"
                                >
                                    <LuSquareDashedMousePointer className="workspace-icon" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                        {endNodeId
                                            ? `E: ${state.nodes[endNodeId]?.label ?? '?'}`
                                            : 'Fim'}
                                    </span>
                                </WorkspaceToolButton>
                            )}
                        </div>
                    )}

                    <WorkspaceToolButton
                        ariaLabel="Executar algoritmo"
                        title="Executar algoritmo"
                        disabled={algorithm === 'none'}
                        onClick={handleRun}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuPlay className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Executar
                        </span>
                    </WorkspaceToolButton>
                </div>

                {/* Usage hints */}
                {showHelp ? <div className="ui-menu-title-card rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)]">
                    <p className="ui-panel-muted text-xs leading-relaxed space-y-0.5">
                        <span className="block">🖱 Duplo-clique → criar vértice</span>
                        <span className="block">🖱 Clique → selecionar</span>
                        <span className="block">🖱 Direito → criar aresta</span>
                        <span className="block">🖱 Roda → zoom no cursor</span>
                        <span className="block">🖱 Botão do meio / Pan → mover viewport</span>
                        <span className="block">🖱 Duplo-clique no elem. → editar</span>
                        <span className="block">⌨ Delete → remover seleção</span>
                    </p>
                </div>: null}
            </div>
        </GlassCard>
    );
};

export default GraphMenu;
