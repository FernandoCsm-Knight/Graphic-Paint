'use client';

import { LuArrowRight, LuCircle } from 'react-icons/lu';
import DiagramMenu from '@/components/DiagramMenu';
import WorkspaceToolButton from '@/components/WorkspaceToolButton';
import { useAutomatonContext } from '../_context/AutomatonContext';

const exportSvg = () => {
    const svg = document.querySelector<SVGSVGElement>('.automaton-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const blob = new Blob([serializer.serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automaton.svg';
    a.click();
    URL.revokeObjectURL(url);
};

const AutomatonMenu = () => {
    const { state, dispatch } = useAutomatonContext();
    const {
        states,
        transitions,
        snapToGrid,
        selectedStateId,
        transitionSourceId,
        pendingTransitionTargetId,
        showSimulation,
        automatonType,
    } = state;

    const stateCount = Object.keys(states).length;
    const transitionCount = Object.keys(transitions).length;
    const selectedState = selectedStateId ? states[selectedStateId] : null;
    const isPendingTransition = transitionSourceId !== null && pendingTransitionTargetId !== null;

    return (
        <DiagramMenu
            title="Automaton"
            subtitle={`${stateCount} ${stateCount === 1 ? 'estado' : 'estados'} · ${transitionCount} ${transitionCount === 1 ? 'transição' : 'transições'}`}
            badge={automatonType === 'PUSHDOWN' ? 'Pilha' : 'AFN-λ'}
            segments={[
                { label: 'AFN-λ', active: automatonType === 'AFN_LAMBDA', onClick: () => dispatch({ type: 'SET_AUTOMATON_TYPE', value: 'AFN_LAMBDA' }) },
                { label: 'Pilha', active: automatonType === 'PUSHDOWN', onClick: () => dispatch({ type: 'SET_AUTOMATON_TYPE', value: 'PUSHDOWN' }) },
            ]}
            snapToGrid={snapToGrid}
            onSnapToggle={() => dispatch({ type: 'SET_SNAP_TO_GRID', value: !snapToGrid })}
            onClear={() => {
                if (stateCount === 0 || window.confirm('Limpar o autômato?')) {
                    dispatch({ type: 'CLEAR_AUTOMATON' });
                }
            }}
            onExport={exportSvg}
            showSimulation={showSimulation}
            onSimulationToggle={() => dispatch({ type: 'SET_SHOW_SIMULATION', value: !showSimulation })}
            hint={
                transitionSourceId && !isPendingTransition ? (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        Clique direito / clique em outro estado para criar transição
                    </div>
                ) : isPendingTransition ? (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        {automatonType === 'PUSHDOWN'
                            ? 'Digite símbolo, pop e push (λ para vazio)'
                            : 'Digite o símbolo da transição (λ para vazio)'}
                    </div>
                ) : undefined
            }
            helpContent={
                <>
                    <span className="block">🖱 Duplo-clique → criar estado</span>
                    <span className="block">🖱 Clique → selecionar</span>
                    <span className="block">🖱 Direito → iniciar / completar transição</span>
                    <span className="block">🖱 Roda → zoom no cursor</span>
                    <span className="block">🖱 Botão do meio / Pan → mover viewport</span>
                    <span className="block">🖱 Duplo-clique no elemento → editar</span>
                    <span className="block">⌨ Delete → remover seleção</span>
                    <span className="block">λ → símbolo vazio (transição lambda)</span>
                </>
            }
            extraContent={selectedState ? (
                <>
                    <div className="ui-drag-line rounded border" />
                    <div className="flex flex-col gap-(--pm-gap)">
                        <span className="ui-panel-muted text-xs uppercase tracking-[0.18em]">
                            Estado: {selectedState.label}
                        </span>
                        <div className="grid grid-cols-2 gap-(--pm-gap)">
                            <WorkspaceToolButton
                                ariaLabel="Definir como inicial"
                                title="Definir como estado inicial"
                                stayActive
                                active={selectedState.isInitial}
                                onClick={() => dispatch({
                                    type: 'SET_INITIAL_STATE',
                                    id: selectedState.isInitial ? null : selectedState.id,
                                })}
                                className="flex items-center justify-center gap-2 px-2"
                            >
                                <LuArrowRight className="workspace-icon" />
                                <span className="text-xs font-semibold uppercase tracking-[0.14em]">Inicial</span>
                            </WorkspaceToolButton>

                            <WorkspaceToolButton
                                ariaLabel="Alternar estado final"
                                title="Alternar estado final / não-final"
                                stayActive
                                active={selectedState.isFinal}
                                onClick={() => dispatch({ type: 'TOGGLE_FINAL_STATE', id: selectedState.id })}
                                className="flex items-center justify-center gap-2 px-2"
                            >
                                <LuCircle className="workspace-icon" />
                                <span className="text-xs font-semibold uppercase tracking-[0.14em]">Final</span>
                            </WorkspaceToolButton>
                        </div>
                    </div>
                </>
            ) : undefined}
        />
    );
};

export default AutomatonMenu;
