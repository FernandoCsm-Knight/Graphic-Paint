'use client';

import DiagramMenu from '@/components/DiagramMenu';
import { useGraphContext } from '../_context/GraphContext';

const exportSvg = () => {
    const svg = document.querySelector<SVGSVGElement>('.graph-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const blob = new Blob([serializer.serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.svg';
    a.click();
    URL.revokeObjectURL(url);
};

const GraphMenu = () => {
    const { state, dispatch } = useGraphContext();
    const { directed, snapToGrid, nodes, edges, edgeSourceId, showSimulation } = state;

    const nodeCount = Object.keys(nodes).length;
    const edgeCount = Object.keys(edges).length;

    return (
        <DiagramMenu
            title="Graph"
            subtitle={`${nodeCount} ${nodeCount === 1 ? 'vértice' : 'vértices'} · ${edgeCount} ${edgeCount === 1 ? 'aresta' : 'arestas'}`}
            badge={directed ? 'Digrafo' : 'Grafo'}
            segments={[
                { label: 'Grafo', active: !directed, onClick: () => dispatch({ type: 'SET_DIRECTED', value: false }) },
                { label: 'Digrafo', active: directed, onClick: () => dispatch({ type: 'SET_DIRECTED', value: true }) },
            ]}
            snapToGrid={snapToGrid}
            onSnapToggle={() => dispatch({ type: 'SET_SNAP_TO_GRID', value: !snapToGrid })}
            onClear={() => {
                if (nodeCount === 0 || window.confirm('Limpar o grafo?')) {
                    dispatch({ type: 'CLEAR_GRAPH' });
                }
            }}
            onExport={exportSvg}
            showSimulation={showSimulation}
            onSimulationToggle={() => dispatch({ type: 'SET_SHOW_SIMULATION', value: !showSimulation })}
            hint={edgeSourceId ? (
                <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                    Clique direito em outro vértice para criar aresta
                </div>
            ) : undefined}
            helpContent={
                <>
                    <span className="block">🖱 Duplo-clique → criar vértice</span>
                    <span className="block">🖱 Clique → selecionar</span>
                    <span className="block">🖱 Direito → criar aresta</span>
                    <span className="block">🖱 Roda → zoom no cursor</span>
                    <span className="block">🖱 Botão do meio / Pan → mover viewport</span>
                    <span className="block">🖱 Duplo-clique no elem. → editar</span>
                    <span className="block">⌨ Delete → remover seleção</span>
                </>
            }
        />
    );
};

export default GraphMenu;
