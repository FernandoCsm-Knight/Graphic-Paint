import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { AutomatonEditorState, AutomatonAction } from '../types/automaton';

export function useSimulationPlayer(
    state: AutomatonEditorState,
    dispatch: Dispatch<AutomatonAction>,
): void {
    const {
        simulationIsPlaying,
        simulationCurrentStep,
        simulationSteps,
        simulationIntervalMs,
    } = state;

    useEffect(() => {
        if (!simulationIsPlaying) return;

        if (simulationCurrentStep >= simulationSteps.length - 1) {
            dispatch({ type: 'SET_SIMULATION_PLAYING', value: false });
            return;
        }

        const timer = setTimeout(() => {
            dispatch({ type: 'SIMULATION_STEP_FORWARD' });
        }, simulationIntervalMs);

        return () => clearTimeout(timer);
    }, [
        simulationIsPlaying,
        simulationCurrentStep,
        simulationSteps.length,
        simulationIntervalMs,
        dispatch,
    ]);
}
