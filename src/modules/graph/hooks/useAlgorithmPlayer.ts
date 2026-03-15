import { useEffect } from 'react';
import type { GraphState, GraphAction } from '../types/graph';

/**
 * Handles the auto-play timer for algorithm step-through.
 * When `isPlaying` is true it advances one step every `stepIntervalMs` ms,
 * automatically pausing when the last step is reached.
 */
export function useAlgorithmPlayer(
    state: GraphState,
    dispatch: React.Dispatch<GraphAction>,
): void {
    const { isPlaying, currentStepIndex, algorithmSteps, stepIntervalMs } = state;

    useEffect(() => {
        if (!isPlaying) return;

        if (currentStepIndex >= algorithmSteps.length - 1) {
            dispatch({ type: 'SET_PLAYING', value: false });
            return;
        }

        const timer = setTimeout(() => {
            dispatch({ type: 'STEP_FORWARD' });
        }, stepIntervalMs);

        return () => clearTimeout(timer);
    }, [isPlaying, currentStepIndex, algorithmSteps.length, stepIntervalMs, dispatch]);
}
