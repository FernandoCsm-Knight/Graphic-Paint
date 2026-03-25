import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { AutomatonEditorState, AutomatonAction } from '../_types/automaton';

export interface AutomatonContextValue {
    state: AutomatonEditorState;
    dispatch: Dispatch<AutomatonAction>;
}

export const AutomatonContext = createContext<AutomatonContextValue | null>(null);

export function useAutomatonContext(): AutomatonContextValue {
    const ctx = useContext(AutomatonContext);
    if (!ctx) throw new Error('useAutomatonContext must be used within AutomatonProvider');
    return ctx;
}
