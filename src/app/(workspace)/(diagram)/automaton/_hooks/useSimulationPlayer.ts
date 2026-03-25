import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { AutomatonEditorState, AutomatonAction } from '../_types/automaton';
import { useStepPlayer } from '@/hooks/useStepPlayer';

export function useSimulationPlayer(
    state: AutomatonEditorState,
    dispatch: Dispatch<AutomatonAction>,
): void {
    const { simulationIsPlaying, simulationCurrentStep, simulationSteps, simulationIntervalMs } = state;

    const onPause = useCallback(() => dispatch({ type: 'SET_SIMULATION_PLAYING', value: false }), [dispatch]);
    const onStepForward = useCallback(() => dispatch({ type: 'SIMULATION_STEP_FORWARD' }), [dispatch]);

    useStepPlayer(
        { isPlaying: simulationIsPlaying, currentStepIndex: simulationCurrentStep, stepsLength: simulationSteps.length, intervalMs: simulationIntervalMs },
        onPause,
        onStepForward,
    );
}
