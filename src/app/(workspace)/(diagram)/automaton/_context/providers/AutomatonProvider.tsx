'use client';

import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { AutomatonContext } from '../AutomatonContext';
import type { AutomatonEditorState, AutomatonAction, AutomatonPersistedState } from '../../_types/automaton';
import { STANDARD_GRID_SIZE } from '@/utils/workspaceGrid';

const initialState: AutomatonEditorState = {
    states: {},
    transitions: {},
    selectedStateId: null,
    selectedTransitionId: null,
    transitionSourceId: null,
    pendingTransitionTargetId: null,
    editingStateId: null,
    editingTransitionId: null,
    snapToGrid: true,
    gridSize: STANDARD_GRID_SIZE,
    automatonType: 'AFN_LAMBDA',
    showSimulation: false,
    simulationInput: '',
    simulationIsPlaying: false,
    simulationIntervalMs: 500,
    simulationCurrentStep: 0,
    simulationSteps: [],
};

function automatonReducer(state: AutomatonEditorState, action: AutomatonAction): AutomatonEditorState {
    switch (action.type) {
        case 'HYDRATE_AUTOMATON':
            return {
                ...initialState,
                ...action.state,
            };

        case 'ADD_STATE':
            return { ...state, states: { ...state.states, [action.state.id]: action.state } };

        case 'MOVE_STATE': {
            const s = state.states[action.id];
            if (!s) return state;
            let { x, y } = action;
            if (state.snapToGrid) {
                x = Math.round(x / state.gridSize) * state.gridSize;
                y = Math.round(y / state.gridSize) * state.gridSize;
            }
            return { ...state, states: { ...state.states, [action.id]: { ...s, x, y } } };
        }

        case 'DELETE_STATE': {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [action.id]: _deleted, ...remainingStates } = state.states;
            const transitions = Object.fromEntries(
                Object.entries(state.transitions).filter(
                    ([, t]) => t.source !== action.id && t.target !== action.id
                )
            );
            return {
                ...state,
                states: remainingStates,
                transitions,
                selectedStateId: state.selectedStateId === action.id ? null : state.selectedStateId,
                transitionSourceId: state.transitionSourceId === action.id ? null : state.transitionSourceId,
            };
        }

        case 'UPDATE_STATE_LABEL': {
            const s = state.states[action.id];
            if (!s) return state;
            return {
                ...state,
                states: { ...state.states, [action.id]: { ...s, label: action.label } },
                editingStateId: null,
            };
        }

        case 'SET_INITIAL_STATE': {
            const updated = Object.fromEntries(
                Object.entries(state.states).map(([id, s]) => [
                    id,
                    { ...s, isInitial: id === action.id },
                ])
            );
            return { ...state, states: updated };
        }

        case 'TOGGLE_FINAL_STATE': {
            const s = state.states[action.id];
            if (!s) return state;
            return {
                ...state,
                states: { ...state.states, [action.id]: { ...s, isFinal: !s.isFinal } },
            };
        }

        case 'ADD_TRANSITION':
            return {
                ...state,
                transitions: { ...state.transitions, [action.transition.id]: action.transition },
                transitionSourceId: null,
                pendingTransitionTargetId: null,
            };

        case 'DELETE_TRANSITION': {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [action.id]: _deleted, ...remainingTransitions } = state.transitions;
            return {
                ...state,
                transitions: remainingTransitions,
                selectedTransitionId:
                    state.selectedTransitionId === action.id ? null : state.selectedTransitionId,
            };
        }

        case 'UPDATE_TRANSITION_SYMBOL': {
            const t = state.transitions[action.id];
            if (!t) return state;
            return {
                ...state,
                transitions: { ...state.transitions, [action.id]: { ...t, symbol: action.symbol } },
                editingTransitionId: null,
            };
        }

        case 'SELECT_STATE':
            return { ...state, selectedStateId: action.id, selectedTransitionId: null };

        case 'SELECT_TRANSITION':
            return { ...state, selectedTransitionId: action.id, selectedStateId: null };

        case 'START_TRANSITION_FROM':
            return {
                ...state,
                transitionSourceId: action.id,
                pendingTransitionTargetId: null,
                editingTransitionId: null,
            };

        case 'SET_PENDING_TRANSITION_TARGET':
            return { ...state, pendingTransitionTargetId: action.id };

        case 'CANCEL_TRANSITION':
            return {
                ...state,
                transitionSourceId: null,
                pendingTransitionTargetId: null,
            };

        case 'SET_EDITING_STATE':
            return { ...state, editingStateId: action.id, editingTransitionId: null };

        case 'SET_EDITING_TRANSITION':
            return { ...state, editingTransitionId: action.id, editingStateId: null };

        case 'SET_SNAP_TO_GRID':
            return { ...state, snapToGrid: action.value };

        case 'SET_AUTOMATON_TYPE':
            return { ...state, automatonType: action.value, showSimulation: false, simulationIsPlaying: false };

        case 'UPDATE_TRANSITION_PDA': {
            const t = state.transitions[action.id];
            if (!t) return state;
            return {
                ...state,
                transitions: {
                    ...state.transitions,
                    [action.id]: { ...t, symbol: action.symbol, stackPop: action.stackPop, stackPush: action.stackPush },
                },
                editingTransitionId: null,
            };
        }

        case 'CLEAR_AUTOMATON':
            return {
                ...initialState,
                snapToGrid: state.snapToGrid,
                gridSize: state.gridSize,
                automatonType: state.automatonType,
            };

        case 'SET_SHOW_SIMULATION':
            return {
                ...state,
                showSimulation: action.value,
                simulationIsPlaying: action.value ? state.simulationIsPlaying : false,
            };

        case 'SET_SIMULATION_INPUT':
            return { ...state, simulationInput: action.value };

        case 'SET_SIMULATION_PLAYING':
            return { ...state, simulationIsPlaying: action.value };

        case 'SET_SIMULATION_INTERVAL':
            return { ...state, simulationIntervalMs: action.ms };

        case 'SIMULATION_STEP_FORWARD':
            return {
                ...state,
                simulationCurrentStep: Math.min(
                    state.simulationCurrentStep + 1,
                    Math.max(0, state.simulationSteps.length - 1),
                ),
            };

        case 'SIMULATION_STEP_BACKWARD':
            return {
                ...state,
                simulationCurrentStep: Math.max(state.simulationCurrentStep - 1, 0),
            };

        case 'SET_SIMULATION_STEPS':
            return {
                ...state,
                simulationSteps: action.steps,
                simulationCurrentStep: 0,
                simulationIsPlaying: false,
            };

        default:
            return state;
    }
}

type AutomatonProviderProps = {
    children: ReactNode;
    initialState?: AutomatonPersistedState;
};

const AutomatonProvider = ({ children, initialState: persistedState }: AutomatonProviderProps) => {
    const [state, dispatch] = useReducer(
        automatonReducer,
        persistedState ? { ...initialState, ...persistedState } : initialState,
    );
    const value = useMemo(() => ({ state, dispatch }), [state]);
    return <AutomatonContext.Provider value={value}>{children}</AutomatonContext.Provider>;
};

export default AutomatonProvider;
