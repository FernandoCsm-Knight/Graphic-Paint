import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useWorkspacePanZoom from '../../hooks/useWorkspacePanZoom';
import useWorkspaceViewport from '../../hooks/useWorkspaceViewport';
import { useWorkspaceContext } from '../../context/WorkspaceContext';
import { useAutomatonContext } from './context/AutomatonContext';
import { useAutomatonD3 } from './hooks/useAutomatonD3';
import { useSimulationPlayer } from './hooks/useSimulationPlayer';
import { simulateAFNLambda } from './algorithms/AFNLambda';
import { simulatePDA } from './algorithms/PDA';
import AutomatonMenu from './components/AutomatonMenu';
import AutomatonLabelEditor from './components/AutomatonLabelEditor';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import SimulationPlayer from '../../components/SimulationPlayer';
import StackDisplay from '../../components/StackDisplay';

const AutomatonWorkspace = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const isPanModeActiveRef = useRef(false);
    const isPanningRef = useRef(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [selectedInputIndex, setSelectedInputIndex] = useState(0);

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

    const { state, dispatch } = useAutomatonContext();

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
        setIsPanning: (value) => {
            isPanningRef.current = value;
            setCanvasPanning(value);
        },
        isPanModeActive,
        getViewportSize,
        clampViewOffset,
        getMinAllowedZoom,
    });

    useAutomatonD3(
        svgRef,
        state,
        dispatch,
        { viewOffset, zoom, viewportSize },
        { isPanModeActiveRef, isPanningRef },
    );

    useSimulationPlayer(state, dispatch);

    // ── Recompute simulation steps when input or automaton structure changes ───
    const statesKey = Object.values(state.states)
        .map((s) => `${s.id}:${s.isInitial}:${s.isFinal}`)
        .sort()
        .join('|');
    const transitionsKey = Object.values(state.transitions)
        .map((t) => `${t.source}>${t.symbol}>${t.stackPop ?? ''}>${t.stackPush ?? ''}>${t.target}`)
        .sort()
        .join('|');

    // ── Parse comma-separated inputs ─────────────────────────────────────────
    const inputs = useMemo(() => {
        const parts = state.simulationInput.split(',').map((s) => s.trim());
        return parts.length > 0 ? parts : [''];
    }, [state.simulationInput]);

    const activeIndex = Math.min(selectedInputIndex, inputs.length - 1);
    const activeInput = inputs[activeIndex];

    // Reset selected index when the input list changes
    useEffect(() => {
        setSelectedInputIndex(0);
    }, [state.simulationInput]);

    // ── Recompute simulation steps for the active input ───────────────────────
    useEffect(() => {
        if (!state.showSimulation) return;
        const statesArr = Object.values(state.states);
        const transitionsArr = Object.values(state.transitions);
        const steps = state.automatonType === 'PUSHDOWN'
            ? simulatePDA(statesArr, transitionsArr, activeInput)
            : simulateAFNLambda(statesArr, transitionsArr, activeInput);
        dispatch({ type: 'SET_SIMULATION_STEPS', steps });
    // statesKey, transitionsKey and activeInput are stable strings — safe as deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statesKey, transitionsKey, activeInput, state.showSimulation, state.automatonType]);

    // ── Batch verdicts for all comma-separated inputs ─────────────────────────
    const batchVerdicts = useMemo(() => {
        if (!state.showSimulation || inputs.length <= 1) return [];
        const statesArr = Object.values(state.states);
        const transitionsArr = Object.values(state.transitions);
        return inputs.map((inp) => {
            const steps = state.automatonType === 'PUSHDOWN'
                ? simulatePDA(statesArr, transitionsArr, inp)
                : simulateAFNLambda(statesArr, transitionsArr, inp);
            return { input: inp, accepted: steps[steps.length - 1]?.isAccepted ?? false };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statesKey, transitionsKey, state.showSimulation, state.automatonType, state.simulationInput]);

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

    return (
        <WorkspaceLayout
            onWheel={(event) => {
                if ((event.target as HTMLElement).closest('[data-automaton-menu]')) return;
                handleWheel(event);
            }}
            badge={badge}
        >
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
                                onChange={(e) =>
                                    dispatch({ type: 'SET_SIMULATION_INPUT', value: e.target.value })
                                }
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="ex: aab, 01λ, ab&#44;ba, …"
                                className="ui-input rounded-lg px-2 py-1.5 text-sm w-full font-mono"
                                aria-label="String de entrada para o autômato"
                            />
                            {batchVerdicts.length > 1 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {batchVerdicts.map((v, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setSelectedInputIndex(i)}
                                            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono cursor-pointer transition-all ${
                                                i === activeIndex ? 'ui-menu-title-badge ring-1' : 'ui-panel-muted'
                                            }`}
                                        >
                                            <span>{v.input || 'λ'}</span>
                                            <span className={v.accepted ? 'text-green-500' : 'text-red-500'}>
                                                {v.accepted ? '✓' : '✗'}
                                            </span>
                                        </button>
                                    ))}
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
                    className="automaton-svg absolute inset-0 block h-full w-full touch-none select-none"
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
                <AutomatonLabelEditor svgRef={svgRef} />
            </div>
        </WorkspaceLayout>
    );
};

export default AutomatonWorkspace;
