export type NodeId = string;
export type EdgeId = string;

export interface GraphNode {
    id: NodeId;
    x: number;
    y: number;
    label: string;
}

export interface GraphEdge {
    id: EdgeId;
    source: NodeId;
    target: NodeId;
    weight: number;
}

export type AlgorithmId = 'bfs' | 'dfs' | 'dijkstra';

export interface AlgorithmStep {
    visitedNodes: Set<NodeId>;
    activeNode: NodeId | undefined;
    visitedEdges: Set<EdgeId>;
    activeEdge: EdgeId | undefined;
    message: string;
}

export type SelectingFor = 'none' | 'startNode' | 'endNode';

export interface GraphState {
    nodes: Record<NodeId, GraphNode>;
    edges: Record<EdgeId, GraphEdge>;
    selectedNodeId: NodeId | null;
    selectedEdgeId: EdgeId | null;
    edgeSourceId: NodeId | null;
    editingNodeId: NodeId | null;
    editingEdgeId: EdgeId | null;
    directed: boolean;
    snapToGrid: boolean;
    gridSize: number;
    showSimulation: boolean;
    algorithm: AlgorithmId;
    startNodeId: NodeId | null;
    endNodeId: NodeId | null;
    selectingFor: SelectingFor;
    algorithmSteps: AlgorithmStep[];
    currentStepIndex: number;
    isPlaying: boolean;
    stepIntervalMs: number;
}

export type GraphAction =
    | { type: 'ADD_NODE'; node: GraphNode }
    | { type: 'MOVE_NODE'; id: NodeId; x: number; y: number }
    | { type: 'DELETE_NODE'; id: NodeId }
    | { type: 'UPDATE_NODE_LABEL'; id: NodeId; label: string }
    | { type: 'ADD_EDGE'; edge: GraphEdge }
    | { type: 'DELETE_EDGE'; id: EdgeId }
    | { type: 'UPDATE_EDGE'; id: EdgeId; weight: number }
    | { type: 'SELECT_NODE'; id: NodeId | null }
    | { type: 'SELECT_EDGE'; id: EdgeId | null }
    | { type: 'START_EDGE_FROM'; id: NodeId }
    | { type: 'CANCEL_EDGE' }
    | { type: 'SET_EDITING_NODE'; id: NodeId | null }
    | { type: 'SET_EDITING_EDGE'; id: EdgeId | null }
    | { type: 'SET_DIRECTED'; value: boolean }
    | { type: 'SET_SNAP_TO_GRID'; value: boolean }
    | { type: 'SET_ALGORITHM'; algorithm: AlgorithmId }
    | { type: 'SET_SELECTING_FOR'; target: SelectingFor }
    | { type: 'SET_START_NODE'; id: NodeId | null }
    | { type: 'SET_END_NODE'; id: NodeId | null }
    | { type: 'SET_ALGORITHM_STEPS'; steps: AlgorithmStep[] }
    | { type: 'STEP_FORWARD' }
    | { type: 'STEP_BACKWARD' }
    | { type: 'SET_PLAYING'; value: boolean }
    | { type: 'SET_STEP_INTERVAL'; ms: number }
    | { type: 'SET_SHOW_SIMULATION'; value: boolean }
    | { type: 'CLEAR_GRAPH' };
