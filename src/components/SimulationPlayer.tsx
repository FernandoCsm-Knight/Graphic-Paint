'use client';

import type { ReactNode } from 'react';
import { LuChevronLeft, LuChevronRight, LuPause, LuPlay, LuX } from 'react-icons/lu';
import GlassCard from './GlassCard';
import WorkspaceToolButton from './WorkspaceToolButton';

const MIN_INTERVAL_MS = 100;
const MAX_INTERVAL_MS = 3000;
const STEP_INTERVAL_MS = 50;

export interface SimulationPlayerProps {
    steps: number;
    currentStep: number;
    isPlaying: boolean;
    intervalMs: number;
    onPlay: () => void;
    onPause: () => void;
    onPrev: () => void;
    onNext: () => void;
    onIntervalChange: (ms: number) => void;
    onClose?: () => void;
    /** Step description shown below the header (e.g. "Lendo 'a' → {q1, q2}"). */
    message?: string;
    children?: ReactNode;
    initialPosition?: () => { x: number; y: number };
}

const SimulationPlayer = ({
    steps,
    currentStep,
    isPlaying,
    intervalMs,
    onPlay,
    onPause,
    onPrev,
    onNext,
    onIntervalChange,
    onClose,
    message,
    children,
    initialPosition,
}: SimulationPlayerProps) => {
    const atStart = currentStep <= 0;
    const atEnd = steps > 0 && currentStep >= steps - 1;
    const progressPct = steps > 0 ? ((currentStep + 1) / steps) * 100 : 0;

    const togglePlay = () => {
        if (isPlaying) {
            onPause();
        } else {
            onPlay();
        }
    };

    const formatInterval = (ms: number) =>
        ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.0', '')} s`;

    return (
        <GlassCard
            initial={initialPosition ?? (() => ({ x: Math.max(0, window.innerWidth - 340), y: 24 }))}
            className="workspace-menu-shell"
        >
            <div className="relative min-w-60 flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)]">

                {/* Header */}
                <div className="ui-menu-title-card flex min-w-0 flex-col gap-1 rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)] shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.22em] ui-menu-title-heading">
                            Simulação
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="ui-menu-title-badge rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
                                {steps > 0 ? `${currentStep + 1} / ${steps}` : '—'}
                            </span>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Fechar simulação"
                                    className="ui-panel-muted hover:ui-menu-title-heading transition-colors duration-150 p-0.5 rounded"
                                >
                                    <LuX size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                    {message && (
                        <p className="ui-panel-muted text-xs leading-snug">{message}</p>
                    )}
                </div>

                {/* Optional slot (e.g., input string for automaton) */}
                {children && (
                    <div className="flex flex-col gap-[var(--pm-gap)]">
                        {children}
                    </div>
                )}

                {/* Step controls */}
                <div className="flex items-center justify-center gap-[var(--pm-gap)]">
                    <WorkspaceToolButton
                        ariaLabel="Passo anterior"
                        title="Passo anterior"
                        disabled={atStart || isPlaying}
                        onClick={onPrev}
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
                        onClick={onNext}
                        className="flex items-center justify-center"
                    >
                        <LuChevronRight className="workspace-icon" />
                    </WorkspaceToolButton>
                </div>

                {/* Progress bar */}
                <div className="ui-menu-segmented rounded-lg overflow-hidden h-1.5">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${progressPct}%`,
                            background: 'var(--ui-menu-control-active-surface)',
                        }}
                    />
                </div>

                {/* Interval range */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="ui-panel-muted text-xs">Intervalo</span>
                        <span className="ui-menu-title-badge rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
                            {formatInterval(intervalMs)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={MIN_INTERVAL_MS}
                        max={MAX_INTERVAL_MS}
                        step={STEP_INTERVAL_MS}
                        value={intervalMs}
                        onChange={(e) => onIntervalChange(Number(e.target.value))}
                        className="slider w-full"
                        aria-label="Intervalo entre passos"
                    />
                </div>
            </div>
        </GlassCard>
    );
};

export default SimulationPlayer;
