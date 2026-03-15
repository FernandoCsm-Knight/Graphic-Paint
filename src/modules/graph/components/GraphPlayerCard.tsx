import { LuChevronLeft, LuChevronRight, LuPause, LuPlay } from 'react-icons/lu';
import GlassCard from '../../../components/GlassCard';
import WorkspaceToolButton from '../../../components/WorkspaceToolButton';
import { useGraphContext } from '../context/GraphContext';

const INTERVAL_OPTIONS = [200, 400, 800, 1200, 2000] as const;

const GraphPlayerCard = () => {
    const { state, dispatch } = useGraphContext();
    const { algorithmSteps, currentStepIndex, isPlaying, stepIntervalMs } = state;

    if (algorithmSteps.length === 0) return null;

    const totalSteps = algorithmSteps.length;
    const atStart = currentStepIndex === 0;
    const atEnd = currentStepIndex >= totalSteps - 1;
    const currentMessage = algorithmSteps[currentStepIndex]?.message ?? '';

    const togglePlay = () => {
        if (atEnd) {
            // Restart from beginning then play
            dispatch({ type: 'STEP_BACKWARD' }); // go to step 0 via SET_STEP isn't defined; use repeated backward
            dispatch({ type: 'SET_ALGORITHM_STEPS', steps: algorithmSteps });
            dispatch({ type: 'SET_PLAYING', value: true });
        } else {
            dispatch({ type: 'SET_PLAYING', value: !isPlaying });
        }
    };

    return (
        <GlassCard
            initial={() => ({ x: window.innerWidth - 320, y: 24 })}
            className="workspace-menu-shell"
        >
            <div className="relative min-w-60 flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)]">
                {/* Title row */}
                <div className="ui-menu-title-card flex min-w-0 flex-col gap-1 rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)] shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.22em] ui-menu-title-heading">
                            Execução
                        </span>
                        <span className="ui-menu-title-badge rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
                            {currentStepIndex + 1} / {totalSteps}
                        </span>
                    </div>
                    {currentMessage && (
                        <p className="ui-panel-muted text-xs leading-snug">{currentMessage}</p>
                    )}
                </div>

                {/* Step controls */}
                <div className="flex items-center justify-center gap-[var(--pm-gap)]">
                    <WorkspaceToolButton
                        ariaLabel="Passo anterior"
                        title="Passo anterior"
                        disabled={atStart || isPlaying}
                        onClick={() => dispatch({ type: 'STEP_BACKWARD' })}
                        className="flex items-center justify-center"
                    >
                        <LuChevronLeft className="workspace-icon" />
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel={isPlaying ? 'Pausar' : 'Reproduzir'}
                        title={isPlaying ? 'Pausar' : 'Reproduzir'}
                        onClick={togglePlay}
                        className="flex items-center justify-center"
                    >
                        {isPlaying ? (
                            <LuPause className="workspace-icon" />
                        ) : (
                            <LuPlay className="workspace-icon" />
                        )}
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Próximo passo"
                        title="Próximo passo"
                        disabled={atEnd || isPlaying}
                        onClick={() => dispatch({ type: 'STEP_FORWARD' })}
                        className="flex items-center justify-center"
                    >
                        <LuChevronRight className="workspace-icon" />
                    </WorkspaceToolButton>
                </div>

                {/* Step progress bar */}
                <div className="ui-menu-segmented rounded-lg overflow-hidden h-1.5">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                            background: 'var(--ui-menu-control-active-surface)',
                        }}
                    />
                </div>

                {/* Interval selector */}
                <div className="flex items-center gap-[var(--pm-gap)]">
                    <span className="ui-panel-muted text-xs flex-shrink-0 min-w-0">Intervalo</span>
                    <select
                        value={stepIntervalMs}
                        onChange={(e) =>
                            dispatch({ type: 'SET_STEP_INTERVAL', ms: Number(e.target.value) })
                        }
                        className="ui-input rounded-lg px-2 py-1 text-xs flex-1 min-w-0 cursor-pointer"
                    >
                        {INTERVAL_OPTIONS.map((ms) => (
                            <option key={ms} value={ms}>
                                {ms < 1000 ? `${ms} ms` : `${ms / 1000} s`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </GlassCard>
    );
};

export default GraphPlayerCard;
