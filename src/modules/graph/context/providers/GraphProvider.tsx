import { useReducer, useMemo } from 'react';
import type { ReactNode } from 'react';
import { GraphContext } from '../GraphContext';
import type { GraphState, GraphAction } from '../../types/graph';

const initialState: GraphState = {
    nodes: {},
    edges: {},
    selectedNodeId: null,
    selectedEdgeId: null,
    edgeSourceId: null,
    editingNodeId: null,
    editingEdgeId: null,
    directed: true,
    snapToGrid: true,
    gridSize: 40,
    algorithm: 'none',
    startNodeId: null,
    endNodeId: null,
    selectingFor: 'none',
    algorithmSteps: [],
    currentStepIndex: 0,
    isPlaying: false,
    stepIntervalMs: 800,
};

function graphReducer(state: GraphState, action: GraphAction): GraphState {
    switch (action.type) {
        case 'ADD_NODE':
            return { ...state, nodes: { ...state.nodes, [action.node.id]: action.node } };

        case 'MOVE_NODE': {
            const node = state.nodes[action.id];
            if (!node) return state;
            let { x, y } = action;
            if (state.snapToGrid) {
                x = Math.round(x / state.gridSize) * state.gridSize;
                y = Math.round(y / state.gridSize) * state.gridSize;
            }
            return { ...state, nodes: { ...state.nodes, [action.id]: { ...node, x, y } } };
        }

        case 'DELETE_NODE': {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [action.id]: _deleted, ...remainingNodes } = state.nodes;
            const edges = Object.fromEntries(
                Object.entries(state.edges).filter(
                    ([, e]) => e.source !== action.id && e.target !== action.id
                )
            );
            return {
                ...state,
                nodes: remainingNodes,
                edges,
                selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId,
                startNodeId: state.startNodeId === action.id ? null : state.startNodeId,
                endNodeId: state.endNodeId === action.id ? null : state.endNodeId,
                edgeSourceId: state.edgeSourceId === action.id ? null : state.edgeSourceId,
                algorithmSteps: [],
                currentStepIndex: 0,
                isPlaying: false,
            };
        }

        case 'UPDATE_NODE_LABEL': {
            const node = state.nodes[action.id];
            if (!node) return state;
            return {
                ...state,
                nodes: { ...state.nodes, [action.id]: { ...node, label: action.label } },
                editingNodeId: null,
            };
        }

        case 'ADD_EDGE': {
            const alreadyExists = Object.values(state.edges).some(
                (e) => e.source === action.edge.source && e.target === action.edge.target
            );
            if (alreadyExists) return { ...state, edgeSourceId: null };
            return {
                ...state,
                edges: { ...state.edges, [action.edge.id]: action.edge },
                edgeSourceId: null,
                algorithmSteps: [],
                currentStepIndex: 0,
                isPlaying: false,
            };
        }

        case 'DELETE_EDGE': {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [action.id]: _deleted, ...remainingEdges } = state.edges;
            return {
                ...state,
                edges: remainingEdges,
                selectedEdgeId: state.selectedEdgeId === action.id ? null : state.selectedEdgeId,
                algorithmSteps: [],
                currentStepIndex: 0,
                isPlaying: false,
            };
        }

        case 'UPDATE_EDGE': {
            const edge = state.edges[action.id];
            if (!edge) return state;
            return {
                ...state,
                edges: { ...state.edges, [action.id]: { ...edge, weight: action.weight } },
                editingEdgeId: null,
            };
        }

        case 'SELECT_NODE':
            return { ...state, selectedNodeId: action.id, selectedEdgeId: null };

        case 'SELECT_EDGE':
            return { ...state, selectedEdgeId: action.id, selectedNodeId: null };

        case 'START_EDGE_FROM':
            return { ...state, edgeSourceId: action.id };

        case 'CANCEL_EDGE':
            return { ...state, edgeSourceId: null };

        case 'SET_EDITING_NODE':
            return { ...state, editingNodeId: action.id, editingEdgeId: null };

        case 'SET_EDITING_EDGE':
            return { ...state, editingEdgeId: action.id, editingNodeId: null };

        case 'SET_DIRECTED':
            return { ...state, directed: action.value };

        case 'SET_SNAP_TO_GRID':
            return { ...state, snapToGrid: action.value };

        case 'SET_ALGORITHM':
            return {
                ...state,
                algorithm: action.algorithm,
                algorithmSteps: [],
                currentStepIndex: 0,
                isPlaying: false,
            };

        case 'SET_SELECTING_FOR':
            return { ...state, selectingFor: action.target };

        case 'SET_START_NODE':
            return { ...state, startNodeId: action.id, selectingFor: 'none' };

        case 'SET_END_NODE':
            return { ...state, endNodeId: action.id, selectingFor: 'none' };

        case 'SET_ALGORITHM_STEPS':
            return {
                ...state,
                algorithmSteps: action.steps,
                currentStepIndex: 0,
                isPlaying: false,
            };

        case 'STEP_FORWARD':
            return {
                ...state,
                currentStepIndex: Math.min(state.currentStepIndex + 1, state.algorithmSteps.length - 1),
            };

        case 'STEP_BACKWARD':
            return {
                ...state,
                currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
            };

        case 'SET_PLAYING':
            return { ...state, isPlaying: action.value };

        case 'SET_STEP_INTERVAL':
            return { ...state, stepIntervalMs: action.ms };

        case 'CLEAR_GRAPH':
            return {
                ...initialState,
                directed: state.directed,
                snapToGrid: state.snapToGrid,
                gridSize: state.gridSize,
                stepIntervalMs: state.stepIntervalMs,
                algorithm: state.algorithm,
            };

        default:
            return state;
    }
}

const GraphProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(graphReducer, initialState);
    const value = useMemo(() => ({ state, dispatch }), [state]);

    return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export default GraphProvider;
