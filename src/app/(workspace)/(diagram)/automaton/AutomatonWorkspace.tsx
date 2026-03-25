'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SimulationPlayer from '@/components/SimulationPlayer';
import StackDisplay from '@/components/StackDisplay';
import { useDiagramWorkspace } from '@/context/DiagramWorkspaceContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';
import AutomatonLabelEditor from '@/app/(workspace)/(diagram)/automaton/_components/AutomatonLabelEditor';
import AutomatonMenu from '@/app/(workspace)/(diagram)/automaton/_components/AutomatonMenu';
import { useAutomatonContext } from '@/app/(workspace)/(diagram)/automaton/_context/AutomatonContext';
import { useAutomatonD3 } from '@/app/(workspace)/(diagram)/automaton/_hooks/useAutomatonD3';
import { useSimulationPlayer } from '@/app/(workspace)/(diagram)/automaton/_hooks/useSimulationPlayer';
import type { AutomatonState, AutomatonTransition, SimulationStep } from '@/app/(workspace)/(diagram)/automaton/_types/automaton';
import type { AutomatonProjectSnapshot } from '@/lib/workspace/projectPersistence.schemas';

type AutomatonWorkspaceProps = {
    projectId?: string;
    initialSnapshot?: AutomatonProjectSnapshot;
};

async function simulateAutomaton(
    automatonType: 'AFN_LAMBDA' | 'PUSHDOWN',
    states: AutomatonState[],
    transitions: AutomatonTransition[],
    input: string,
): Promise<SimulationStep[]> {
    if (automatonType === 'PUSHDOWN') {
        return (await import('@/app/(workspace)/(diagram)/automaton/_algorithms/PDA')).simulatePDA(states, transitions, input);
    }

    return (await import('@/app/(workspace)/(diagram)/automaton/_algorithms/AFNLambda')).simulateAFNLambda(states, transitions, input);
}

export default function AutomatonWorkspace({ projectId, initialSnapshot }: AutomatonWorkspaceProps) {
    const { state, dispatch } = useAutomatonContext();
    const [selectedInputIndex, setSelectedInputIndex] = useState(0);

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

    useAutomatonD3(
        svgRef,
        state,
        dispatch,
        { viewOffset, zoom, viewportSize },
        { isPanModeActiveRef, isPanningRef },
    );

    useSimulationPlayer(state, dispatch);

    const statesArray = useMemo(() => Object.values(state.states), [state.states]);
    const transitionsArray = useMemo(() => Object.values(state.transitions), [state.transitions]);

    const persistedSnapshot = useMemo<AutomatonProjectSnapshot>(() => ({
        automatonType: state.automatonType,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        canvasWidth: worldSize.width,
        canvasHeight: worldSize.height,
        viewOffset,
        zoom,
        states: [...statesArray]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((stateItem) => ({
                id: stateItem.id,
                x: stateItem.x,
                y: stateItem.y,
                label: stateItem.label,
                isInitial: stateItem.isInitial,
                isFinal: stateItem.isFinal,
            })),
        transitions: [...transitionsArray]
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((transition) => ({
                id: transition.id,
                source: transition.source,
                target: transition.target,
                symbol: transition.symbol,
                stackPop: transition.stackPop,
                stackPush: transition.stackPush,
            })),
    }), [state.automatonType, state.gridSize, state.snapToGrid, statesArray, transitionsArray, viewOffset, worldSize.height, worldSize.width, zoom]);

    const inputs = useMemo(() => {
        const parts = state.simulationInput.split(',').map((value) => value.trim());
        return parts.length > 0 ? parts : [''];
    }, [state.simulationInput]);

    const activeIndex = Math.min(selectedInputIndex, inputs.length - 1);
    const activeInput = inputs[activeIndex];

    useEffect(() => {
        if (!initialSnapshot || hydratedRef.current) return;

        dispatch({
            type: 'HYDRATE_AUTOMATON',
            state: {
                states: Object.fromEntries(initialSnapshot.states.map((stateItem) => [stateItem.id, stateItem])),
                transitions: Object.fromEntries(initialSnapshot.transitions.map((transition) => [transition.id, transition])),
                snapToGrid: initialSnapshot.snapToGrid,
                gridSize: initialSnapshot.gridSize,
                automatonType: initialSnapshot.automatonType,
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
        setSelectedInputIndex(0);
    }, [state.simulationInput]);

    useEffect(() => {
        if (!state.showSimulation) return;
        let cancelled = false;

        void simulateAutomaton(state.automatonType, statesArray, transitionsArray, activeInput).then((steps) => {
            if (!cancelled) {
                dispatch({ type: 'SET_SIMULATION_STEPS', steps });
            }
        });

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeInput, state.automatonType, state.showSimulation, statesArray, transitionsArray]);

    useEffect(() => {
        if (!projectId) return;

        const nextPayload = JSON.stringify(persistedSnapshot);
        if (nextPayload === lastSavedPayloadRef.current) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void fetch(`/api/projects/automaton/${projectId}`, {
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

    const batchVerdicts = useMemo(() => {
        if (!state.showSimulation || inputs.length <= 1) return [];
        return inputs.map((input) => ({
            input,
            accepted: state.simulationSteps.length > 0 && input === activeInput
                ? (state.simulationSteps[state.simulationSteps.length - 1]?.isAccepted ?? false)
                : null,
        }));
    }, [activeInput, inputs, state.showSimulation, state.simulationSteps]);

    return (
        <>
            <div data-automaton-menu>
                <AutomatonMenu />
            </div>

            {state.showSimulation && state.automatonType === 'PUSHDOWN' && (
                <div data-automaton-menu>
                    <StackDisplay
                        stack={state.simulationSteps[state.simulationCurrentStep]?.stackSnapshot ?? []}
                        initialPosition={() => ({ x: Math.max(0, window.innerWidth - 480), y: 24 })}
                    />
                </div>
            )}

            {state.showSimulation && (
                <div data-automaton-menu>
                    <SimulationPlayer
                        steps={state.simulationSteps.length}
                        currentStep={state.simulationCurrentStep}
                        isPlaying={state.simulationIsPlaying}
                        intervalMs={state.simulationIntervalMs}
                        message={state.simulationSteps[state.simulationCurrentStep]?.description}
                        onPlay={() => dispatch({ type: 'SET_SIMULATION_PLAYING', value: true })}
                        onPause={() => dispatch({ type: 'SET_SIMULATION_PLAYING', value: false })}
                        onPrev={() => dispatch({ type: 'SIMULATION_STEP_BACKWARD' })}
                        onNext={() => dispatch({ type: 'SIMULATION_STEP_FORWARD' })}
                        onIntervalChange={(ms) => dispatch({ type: 'SET_SIMULATION_INTERVAL', ms })}
                        onClose={() => dispatch({ type: 'SET_SHOW_SIMULATION', value: false })}
                        initialPosition={() => ({ x: Math.max(0, window.innerWidth - 340), y: 24 })}
                    >
                        <div className="flex flex-col gap-1">
                            <span className="ui-panel-muted text-xs uppercase tracking-[0.18em]">
                                Entrada
                            </span>
                            <input
                                type="text"
                                value={state.simulationInput}
                                onChange={(event) =>
                                    dispatch({ type: 'SET_SIMULATION_INPUT', value: event.target.value })
                                }
                                onKeyDown={(event) => event.stopPropagation()}
                                placeholder="ex: aab, 01λ, ab&#44;ba, …"
                                className="ui-input rounded-lg px-2 py-1.5 text-sm w-full font-mono"
                                aria-label="String de entrada para o autômato"
                            />
                            {batchVerdicts.length > 1 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {batchVerdicts.map((verdict, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setSelectedInputIndex(index)}
                                            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono cursor-pointer transition-all ${
                                                index === activeIndex ? 'ui-menu-title-badge ring-1' : 'ui-panel-muted'
                                            }`}
                                        >
                                            <span>{verdict.input || 'λ'}</span>
                                            {verdict.accepted !== null && (
                                                <span className={verdict.accepted ? 'text-green-500' : 'text-red-500'}>
                                                    {verdict.accepted ? '✓' : '✗'}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SimulationPlayer>
                </div>
            )}

            <AutomatonLabelEditor svgRef={svgRef} />
        </>
    );
}
