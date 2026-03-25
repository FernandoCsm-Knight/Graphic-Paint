import { useEffect } from 'react';

interface StepPlayerState {
    isPlaying: boolean;
    currentStepIndex: number;
    stepsLength: number;
    intervalMs: number;
}

/**
 * Generic step-through playback hook.
 * Advances one step every `intervalMs` ms when `isPlaying` is true,
 * automatically pausing when the last step is reached.
 */
export function useStepPlayer(
    { isPlaying, currentStepIndex, stepsLength, intervalMs }: StepPlayerState,
    onPause: () => void,
    onStepForward: () => void,
): void {
    useEffect(() => {
        if (!isPlaying) return;

        if (currentStepIndex >= stepsLength - 1) {
            onPause();
            return;
        }

        const timer = setTimeout(onStepForward, intervalMs);
        return () => clearTimeout(timer);
    }, [isPlaying, currentStepIndex, stepsLength, intervalMs, onPause, onStepForward]);
}
