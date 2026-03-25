export type StateId = string;
export type TransitionId = string;

export interface SimulationStep {
    activeStates: Set<StateId>;
    activeTransitionIds: Set<TransitionId>;
    inputConsumed: number;
    description: string;
    isAccepted: boolean;
    stackSnapshot?: string[];  // pilha neste passo, índice 0 = topo (apenas PDA)
}

export interface AutomatonState {
    id: StateId;
    x: number;
    y: number;
    label: string;
    isInitial: boolean;
    isFinal: boolean;
}

export interface AutomatonTransition {
    id: TransitionId;
    source: StateId;
    target: StateId;
    symbol: string;      // 'a', 'b', 'λ', etc. (pode ser comma-separated)
    stackPop?: string;   // símbolo a desempilhar (λ = não desempilha/não verifica)
    stackPush?: string;  // símbolo(s) a empilhar  (λ = não empilha)
}

export interface AutomatonEditorState {
    states: Record<StateId, AutomatonState>;
    transitions: Record<TransitionId, AutomatonTransition>;
    selectedStateId: StateId | null;
    selectedTransitionId: TransitionId | null;
    /** State that is being used as the source for a new transition (preview line active). */
    transitionSourceId: StateId | null;
    /** Target state chosen for a pending new transition — triggers the label editor. */
    pendingTransitionTargetId: StateId | null;
    editingStateId: StateId | null;
    editingTransitionId: TransitionId | null;
    snapToGrid: boolean;
    gridSize: number;
    automatonType: 'AFN_LAMBDA' | 'PUSHDOWN';
    // ── Simulation ────────────────────────────────────────────
    showSimulation: boolean;
    simulationInput: string;
    simulationIsPlaying: boolean;
    simulationIntervalMs: number;
    simulationCurrentStep: number;
    simulationSteps: SimulationStep[];
}

export type AutomatonPersistedState = Pick<
    AutomatonEditorState,
    'states' | 'transitions' | 'snapToGrid' | 'gridSize' | 'automatonType'
>;

export type AutomatonAction =
    | { type: 'HYDRATE_AUTOMATON'; state: AutomatonPersistedState }
    | { type: 'ADD_STATE'; state: AutomatonState }
    | { type: 'MOVE_STATE'; id: StateId; x: number; y: number }
    | { type: 'DELETE_STATE'; id: StateId }
    | { type: 'UPDATE_STATE_LABEL'; id: StateId; label: string }
    | { type: 'SET_INITIAL_STATE'; id: StateId | null }
    | { type: 'TOGGLE_FINAL_STATE'; id: StateId }
    | { type: 'ADD_TRANSITION'; transition: AutomatonTransition }
    | { type: 'DELETE_TRANSITION'; id: TransitionId }
    | { type: 'UPDATE_TRANSITION_SYMBOL'; id: TransitionId; symbol: string }
    | { type: 'SELECT_STATE'; id: StateId | null }
    | { type: 'SELECT_TRANSITION'; id: TransitionId | null }
    | { type: 'START_TRANSITION_FROM'; id: StateId }
    | { type: 'SET_PENDING_TRANSITION_TARGET'; id: StateId }
    | { type: 'CANCEL_TRANSITION' }
    | { type: 'SET_EDITING_STATE'; id: StateId | null }
    | { type: 'SET_EDITING_TRANSITION'; id: TransitionId | null }
    | { type: 'SET_SNAP_TO_GRID'; value: boolean }
    | { type: 'SET_AUTOMATON_TYPE'; value: 'AFN_LAMBDA' | 'PUSHDOWN' }
    | { type: 'UPDATE_TRANSITION_PDA'; id: TransitionId; symbol: string; stackPop: string; stackPush: string }
    | { type: 'CLEAR_AUTOMATON' }
    // ── Simulation actions ────────────────────────────────────
    | { type: 'SET_SHOW_SIMULATION'; value: boolean }
    | { type: 'SET_SIMULATION_INPUT'; value: string }
    | { type: 'SET_SIMULATION_PLAYING'; value: boolean }
    | { type: 'SET_SIMULATION_INTERVAL'; ms: number }
    | { type: 'SIMULATION_STEP_FORWARD' }
    | { type: 'SIMULATION_STEP_BACKWARD' }
    | { type: 'SET_SIMULATION_STEPS'; steps: SimulationStep[] };
