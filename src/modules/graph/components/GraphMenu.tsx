import {
    LuHand,
    LuCircleDot,
    LuDownload,
    LuGrid2X2,
    LuPlay,
    LuTrash2,
} from 'react-icons/lu';
import GlassCard from '../../../components/GlassCard';
import WorkspaceToolButton from '../../../components/WorkspaceToolButton';
import MenuTitleCard from '../../../components/MenuTitleCard';
import { useGraphContext } from '../context/GraphContext';
import { useWorkspaceContext } from '../../../context/WorkspaceContext';
import { useState } from 'react';

const GraphMenu = () => {
    const { state, dispatch } = useGraphContext();
    const { isPanModeActive, setPanModeActive } = useWorkspaceContext();
    const [showHelp, setShowHelp] = useState(false);
    const { directed, snapToGrid, nodes, edgeSourceId, showSimulation } = state;

    const nodeCount = Object.keys(nodes).length;
    const edgeCount = Object.keys(state.edges).length;

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

    return (
        <GlassCard initial={() => ({ x: 24, y: 24 })} className="workspace-menu-shell">
            <div className="relative min-w-52 md:min-w-72 flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)]">

                {/* Header */}
                <MenuTitleCard
                    title="Graph"
                    subtitle={`${nodeCount} ${nodeCount === 1 ? 'vértice' : 'vértices'} · ${edgeCount} ${edgeCount === 1 ? 'aresta' : 'arestas'}`}
                    badge={directed ? 'Digrafo' : 'Grafo'}
                    segments={[
                        { label: 'Grafo', active: !directed, onClick: () => dispatch({ type: 'SET_DIRECTED', value: false }) },
                        { label: 'Digrafo', active: directed, onClick: () => dispatch({ type: 'SET_DIRECTED', value: true }) },
                    ]}
                />

                {/* Interaction hint — edge creation */}
                {edgeSourceId && (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        Clique direito em outro vértice para criar aresta
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
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Pan</span>
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
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Snap</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Limpar grafo"
                        title="Limpar grafo"
                        onClick={() => {
                            if (nodeCount === 0 || window.confirm('Limpar o grafo?')) {
                                dispatch({ type: 'CLEAR_GRAPH' });
                            }
                        }}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuTrash2 className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Limpar</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Exportar SVG"
                        title="Exportar como SVG"
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuDownload className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Exportar</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Abrir simulador"
                        title={showSimulation ? 'Fechar simulação' : 'Abrir simulação'}
                        stayActive
                        active={showSimulation}
                        onClick={() => dispatch({ type: 'SET_SHOW_SIMULATION', value: !showSimulation })}
                        className="flex items-center justify-center gap-2 px-3 col-span-2"
                    >
                        <LuPlay className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Simular</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Dica de uso"
                        title="Como usar"
                        onClick={() => setShowHelp(!showHelp)}
                        stayActive
                        active={showHelp}
                        className="flex items-center justify-center gap-2 px-3 col-span-2"
                    >
                        <LuCircleDot className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Ajuda</span>
                    </WorkspaceToolButton>
                </div>

                {/* Usage hints */}
                {showHelp && (
                    <div className="ui-menu-title-card rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)]">
                        <p className="ui-panel-muted text-xs leading-relaxed space-y-0.5">
                            <span className="block">🖱 Duplo-clique → criar vértice</span>
                            <span className="block">🖱 Clique → selecionar</span>
                            <span className="block">🖱 Direito → criar aresta</span>
                            <span className="block">🖱 Roda → zoom no cursor</span>
                            <span className="block">🖱 Botão do meio / Pan → mover viewport</span>
                            <span className="block">🖱 Duplo-clique no elem. → editar</span>
                            <span className="block">⌨ Delete → remover seleção</span>
                        </p>
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

export default GraphMenu;
