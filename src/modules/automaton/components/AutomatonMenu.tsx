import { useState } from 'react';
import {
    LuHand,
    LuDownload,
    LuGrid2X2,
    LuTrash2,
    LuCircleDot,
    LuCircle,
    LuArrowRight,
    LuPlay,
} from 'react-icons/lu';
import GlassCard from '../../../components/GlassCard';
import WorkspaceToolButton from '../../../components/WorkspaceToolButton';
import { useAutomatonContext } from '../context/AutomatonContext';
import { useWorkspaceContext } from '../../../context/WorkspaceContext';

const AutomatonMenu = () => {
    const { state, dispatch } = useAutomatonContext();
    const { isPanModeActive, setPanModeActive } = useWorkspaceContext();
    const [showHelp, setShowHelp] = useState(false);

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

    const handleExport = () => {
        const svg = document.querySelector<SVGSVGElement>('.automaton-svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'automaton.svg';
        a.click();
        URL.revokeObjectURL(url);
    };

    const isPendingTransition = transitionSourceId !== null && pendingTransitionTargetId !== null;

    return (
        <GlassCard initial={() => ({ x: 24, y: 24 })} className="workspace-menu-shell">
            <div className="relative min-w-52 md:min-w-72 flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)]">

                {/* Header */}
                <div className="ui-menu-title-card flex min-w-0 flex-col gap-[var(--pm-gap)] rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)] shadow-sm">
                    <div className="flex items-center justify-between gap-[var(--pm-gap)]">
                        <div>
                            <h1 className="text-sm sm:text-base md:text-lg ui-menu-title-heading font-bold uppercase tracking-[0.24em]">
                                Automaton
                            </h1>
                            <p className="ui-panel-muted mt-0.5 text-xs">
                                {stateCount} {stateCount === 1 ? 'estado' : 'estados'} ·{' '}
                                {transitionCount}{' '}
                                {transitionCount === 1 ? 'transição' : 'transições'}
                            </p>
                        </div>
                        <span className="ui-menu-title-badge rounded-full px-[var(--pm-btn-pad)] py-0.5 text-xs font-semibold uppercase tracking-[0.18em]">
                            {automatonType === 'PUSHDOWN' ? 'Pilha' : 'AFN-λ'}
                        </span>
                    </div>
                    <div className="ui-menu-segmented flex items-center gap-1 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => dispatch({ type: 'SET_AUTOMATON_TYPE', value: 'AFN_LAMBDA' })}
                            className={`text-xs ui-menu-segment flex-1 cursor-pointer rounded-md px-[var(--pm-btn-pad)] py-1.5 font-semibold transition duration-200 ${automatonType === 'AFN_LAMBDA' ? 'ui-menu-segment-active shadow-sm' : ''}`}
                        >
                            AFN-λ
                        </button>
                        <button
                            type="button"
                            onClick={() => dispatch({ type: 'SET_AUTOMATON_TYPE', value: 'PUSHDOWN' })}
                            className={`text-xs ui-menu-segment flex-1 cursor-pointer rounded-md px-[var(--pm-btn-pad)] py-1.5 font-semibold transition duration-200 ${automatonType === 'PUSHDOWN' ? 'ui-menu-segment-active shadow-sm' : ''}`}
                        >
                            Pilha
                        </button>
                    </div>
                </div>


                {/* Interaction hints */}
                {transitionSourceId && !isPendingTransition && (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        Clique direito / clique em outro estado para criar transição
                    </div>
                )}
                {isPendingTransition && (
                    <div className="ui-menu-title-badge rounded-lg px-3 py-1.5 text-xs text-center">
                        {automatonType === 'PUSHDOWN'
                            ? 'Digite símbolo, pop e push (λ para vazio)'
                            : 'Digite o símbolo da transição (λ para vazio)'}
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
                        ariaLabel="Limpar autômato"
                        title="Limpar autômato"
                        onClick={() => {
                            if (
                                stateCount === 0 ||
                                window.confirm('Limpar o autômato?')
                            ) {
                                dispatch({ type: 'CLEAR_AUTOMATON' });
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
                        ariaLabel="Abrir simulador"
                        title={showSimulation ? 'Fechar simulação' : 'Abrir simulação'}
                        stayActive
                        active={showSimulation}
                        onClick={() =>
                            dispatch({ type: 'SET_SHOW_SIMULATION', value: !showSimulation })
                        }
                        className="flex items-center justify-center gap-2 px-3 col-span-2"
                    >
                        <LuPlay className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Simular
                        </span>
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
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">
                            Ajuda
                        </span>
                    </WorkspaceToolButton>
                </div>

                {/* State actions (only when a state is selected) */}
                {selectedState && (
                    <>
                        <div className="ui-drag-line rounded border" />
                        <div className="flex flex-col gap-[var(--pm-gap)]">
                            <span className="ui-panel-muted text-xs uppercase tracking-[0.18em]">
                                Estado: {selectedState.label}
                            </span>
                            <div className="grid grid-cols-2 gap-[var(--pm-gap)]">
                                <WorkspaceToolButton
                                    ariaLabel="Definir como inicial"
                                    title="Definir como estado inicial"
                                    stayActive
                                    active={selectedState.isInitial}
                                    onClick={() =>
                                        dispatch({
                                            type: 'SET_INITIAL_STATE',
                                            id: selectedState.isInitial ? null : selectedState.id,
                                        })
                                    }
                                    className="flex items-center justify-center gap-2 px-2"
                                >
                                    <LuArrowRight className="workspace-icon" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                        Inicial
                                    </span>
                                </WorkspaceToolButton>

                                <WorkspaceToolButton
                                    ariaLabel="Alternar estado final"
                                    title="Alternar estado final / não-final"
                                    stayActive
                                    active={selectedState.isFinal}
                                    onClick={() =>
                                        dispatch({
                                            type: 'TOGGLE_FINAL_STATE',
                                            id: selectedState.id,
                                        })
                                    }
                                    className="flex items-center justify-center gap-2 px-2"
                                >
                                    <LuCircle className="workspace-icon" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                                        Final
                                    </span>
                                </WorkspaceToolButton>
                            </div>
                        </div>
                    </>
                )}

                {/* Usage hints */}
                {showHelp && (
                    <div className="ui-menu-title-card rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)]">
                        <p className="ui-panel-muted text-xs leading-relaxed space-y-0.5">
                            <span className="block">🖱 Duplo-clique → criar estado</span>
                            <span className="block">🖱 Clique → selecionar</span>
                            <span className="block">🖱 Direito → iniciar / completar transição</span>
                            <span className="block">🖱 Roda → zoom no cursor</span>
                            <span className="block">🖱 Botão do meio / Pan → mover viewport</span>
                            <span className="block">🖱 Duplo-clique no elemento → editar</span>
                            <span className="block">⌨ Delete → remover seleção</span>
                            <span className="block">λ → símbolo vazio (transição lambda)</span>
                        </p>
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

export default AutomatonMenu;
