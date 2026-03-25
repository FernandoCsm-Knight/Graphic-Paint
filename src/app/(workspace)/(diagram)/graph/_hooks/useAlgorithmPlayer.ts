import { useCallback } from 'react';
import type { GraphState, GraphAction } from '../_types/graph';
import { useStepPlayer } from '@/hooks/useStepPlayer';

export function useAlgorithmPlayer(
    state: GraphState,
    dispatch: React.Dispatch<GraphAction>,
): void {
    const { isPlaying, currentStepIndex, algorithmSteps, stepIntervalMs } = state;

    const onPause = useCallback(() => dispatch({ type: 'SET_PLAYING', value: false }), [dispatch]);
    const onStepForward = useCallback(() => dispatch({ type: 'STEP_FORWARD' }), [dispatch]);

    useStepPlayer(
        { isPlaying, currentStepIndex, stepsLength: algorithmSteps.length, intervalMs: stepIntervalMs },
        onPause,
        onStepForward,
    );
}
