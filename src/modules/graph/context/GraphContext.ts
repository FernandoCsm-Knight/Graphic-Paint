import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { GraphState, GraphAction } from '../types/graph';

export interface GraphContextValue {
    state: GraphState;
    dispatch: Dispatch<GraphAction>;
}

export const GraphContext = createContext<GraphContextValue | null>(null);

export function useGraphContext(): GraphContextValue {
    const ctx = useContext(GraphContext);
    if (!ctx) throw new Error('useGraphContext must be used within GraphProvider');
    return ctx;
}
