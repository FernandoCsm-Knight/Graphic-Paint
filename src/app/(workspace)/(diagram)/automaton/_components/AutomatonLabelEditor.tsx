'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAutomatonContext } from '../_context/AutomatonContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';
import { generateTransitionId } from '../_hooks/useAutomatonD3';

interface AutomatonLabelEditorProps {
    svgRef: RefObject<SVGSVGElement | null>;
}

const AutomatonLabelEditor = ({ svgRef }: AutomatonLabelEditorProps) => {
    const { state, dispatch } = useAutomatonContext();
    const { viewOffset, zoom } = useWorkspaceContext();

    const symbolRef = useRef<HTMLInputElement>(null);
    const popRef = useRef<HTMLInputElement>(null);
    const pushRef = useRef<HTMLInputElement>(null);

    const [symbolValue, setSymbolValue] = useState('');
    const [popValue, setPopValue] = useState('');
    const [pushValue, setPushValue] = useState('');
    const [svgOrigin, setSvgOrigin] = useState<{ left: number; top: number } | null>(null);
    const cancelledRef = useRef(false);
    const committedRef = useRef(false);

    const isPDA = state.automatonType === 'PUSHDOWN';

    const editingState = state.editingStateId ? state.states[state.editingStateId] : null;
    const editingTransition = state.editingTransitionId
        ? state.transitions[state.editingTransitionId]
        : null;

    const isNewTransition =
        state.transitionSourceId !== null && state.pendingTransitionTargetId !== null;

    const isEditing = !!(editingState || editingTransition || isNewTransition);

    // Seed input values whenever the editing target changes
    // (adjusting state during render instead of in an effect).
    const editingKey = `${editingState?.id ?? ''}|${editingTransition?.id ?? ''}|${isNewTransition}`;
    const [prevEditingKey, setPrevEditingKey] = useState<string | null>(null);
    if (prevEditingKey !== editingKey) {
        setPrevEditingKey(editingKey);
        if (editingState) {
            setSymbolValue(editingState.label);
            setPopValue('');
            setPushValue('');
        } else if (editingTransition) {
            setSymbolValue(editingTransition.symbol);
            setPopValue(editingTransition.stackPop ?? '');
            setPushValue(editingTransition.stackPush ?? '');
        } else if (isNewTransition) {
            setSymbolValue('');
            setPopValue('');
            setPushValue('');
        }
    }

    // Reset commit/cancel flags whenever the editing target changes.
    useEffect(() => {
        cancelledRef.current = false;
        committedRef.current = false;
    }, [editingKey]);

    // Focus + select on open
    useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => {
                symbolRef.current?.focus();
                symbolRef.current?.select();
            });
        }
    }, [isEditing]);

    const activeTransitionEndpoints = useMemo(() => {
        if (editingTransition) {
            const src = state.states[editingTransition.source];
            const tgt = state.states[editingTransition.target];
            return src && tgt ? { src, tgt } : null;
        }

        if (isNewTransition && state.transitionSourceId && state.pendingTransitionTargetId) {
            const src = state.states[state.transitionSourceId];
            const tgt = state.states[state.pendingTransitionTargetId];
            return src && tgt ? { src, tgt } : null;
        }

        return null;
    }, [editingTransition, isNewTransition, state.pendingTransitionTargetId, state.states, state.transitionSourceId]);

    // Track the SVG's on-screen origin through subscriptions (resize/scroll),
    // so the editor can be positioned in viewport coordinates.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const updateOrigin = () => {
            const rect = svg.getBoundingClientRect();
            setSvgOrigin((prev) =>
                prev && prev.left === rect.left && prev.top === rect.top
                    ? prev
                    : { left: rect.left, top: rect.top }
            );
        };

        // ResizeObserver fires once right after observe(), seeding the origin.
        const observer = new ResizeObserver(updateOrigin);
        observer.observe(svg);
        window.addEventListener('resize', updateOrigin);
        window.addEventListener('scroll', updateOrigin, true);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateOrigin);
            window.removeEventListener('scroll', updateOrigin, true);
        };
    }, [svgRef]);

    const position = useMemo<{ x: number; y: number } | null>(() => {
        if (!isEditing || !svgOrigin) return null;

        if (editingState) {
            return {
                x: svgOrigin.left + editingState.x * zoom + viewOffset.x,
                y: svgOrigin.top + editingState.y * zoom + viewOffset.y,
            };
        }

        if (activeTransitionEndpoints) {
            const { src, tgt } = activeTransitionEndpoints;
            if (src.id === tgt.id) {
                return {
                    x: svgOrigin.left + src.x * zoom + viewOffset.x,
                    y: svgOrigin.top + (src.y - 22 - 62) * zoom + viewOffset.y,
                };
            }

            return {
                x: svgOrigin.left + ((src.x + tgt.x) / 2) * zoom + viewOffset.x,
                y: svgOrigin.top + ((src.y + tgt.y) / 2) * zoom + viewOffset.y,
            };
        }

        return null;
    }, [activeTransitionEndpoints, editingState, isEditing, svgOrigin, viewOffset.x, viewOffset.y, zoom]);

    if (!isEditing || !position) return null;

    const isTransitionEdit = !!(editingTransition || isNewTransition);
    const showStackFields = isPDA && isTransitionEdit;

    const commit = () => {
        if (committedRef.current || cancelledRef.current) return;
        committedRef.current = true;

        if (editingState) {
            const trimmed = symbolValue.trim();
            dispatch({
                type: 'UPDATE_STATE_LABEL',
                id: editingState.id,
                label: trimmed || editingState.label,
            });
        } else if (editingTransition) {
            const trimmed = symbolValue.trim();
            if (!trimmed) {
                dispatch({ type: 'SET_EDITING_TRANSITION', id: null });
                return;
            }
            if (isPDA) {
                dispatch({
                    type: 'UPDATE_TRANSITION_PDA',
                    id: editingTransition.id,
                    symbol: trimmed,
                    stackPop: popValue.trim() || 'λ',
                    stackPush: pushValue.trim() || 'λ',
                });
            } else {
                dispatch({ type: 'UPDATE_TRANSITION_SYMBOL', id: editingTransition.id, symbol: trimmed });
            }
        } else if (isNewTransition) {
            const symbol = symbolValue.trim() || 'λ';
            const id = generateTransitionId();
            dispatch({
                type: 'ADD_TRANSITION',
                transition: {
                    id,
                    source: state.transitionSourceId!,
                    target: state.pendingTransitionTargetId!,
                    symbol,
                    ...(isPDA && {
                        stackPop: popValue.trim() || 'λ',
                        stackPush: pushValue.trim() || 'λ',
                    }),
                },
            });
        }
    };

    const cancel = () => {
        if (committedRef.current || cancelledRef.current) return;
        cancelledRef.current = true;
        if (isNewTransition) {
            dispatch({ type: 'CANCEL_TRANSITION' });
        } else {
            dispatch({ type: 'SET_EDITING_STATE', id: null });
            dispatch({ type: 'SET_EDITING_TRANSITION', id: null });
        }
    };

    const handleSymbolKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') { cancel(); return; }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (showStackFields) {
                popRef.current?.focus();
                popRef.current?.select();
            } else {
                commit();
            }
        }
    };

    const handlePopKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') { cancel(); return; }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            pushRef.current?.focus();
            pushRef.current?.select();
        }
    };

    const handlePushKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') { cancel(); return; }
        if (e.key === 'Enter') commit();
        if (e.key === 'Tab') { e.preventDefault(); commit(); }
    };

    const offsetY = showStackFields ? 88 : 56;

    return (
        <div
            className="fixed z-50 -translate-x-1/2"
            style={{ left: position.x, top: position.y - offsetY }}
        >
            <div className="ui-floating-card rounded-xl p-2 flex flex-col gap-1.5 shadow-xl">
                {/* Symbol field — always shown */}
                <div className="flex items-center gap-2">
                    <input
                        ref={symbolRef}
                        type="text"
                        value={symbolValue}
                        onChange={(e) => setSymbolValue(e.target.value)}
                        onKeyDown={handleSymbolKeyDown}
                        onBlur={() => { if (!showStackFields) commit(); }}
                        placeholder={isTransitionEdit ? 'a, [a-z], λ, …' : 'Label'}
                        className="ui-input rounded-lg px-2 py-1 text-sm w-28 min-w-0"
                    />
                    <span className="ui-panel-muted text-xs select-none">
                        {isTransitionEdit ? 'símbolo' : 'label'}
                    </span>
                </div>

                {/* Stack fields — PDA transition only */}
                {showStackFields && (
                    <>
                        <div className="flex items-center gap-2">
                            <input
                                ref={popRef}
                                type="text"
                                value={popValue}
                                onChange={(e) => setPopValue(e.target.value)}
                                onKeyDown={handlePopKeyDown}
                                placeholder="λ"
                                className="ui-input rounded-lg px-2 py-1 text-sm w-28 min-w-0 font-mono uppercase"
                            />
                            <span className="ui-panel-muted text-xs select-none">pop</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                ref={pushRef}
                                type="text"
                                value={pushValue}
                                onChange={(e) => setPushValue(e.target.value)}
                                onKeyDown={handlePushKeyDown}
                                onBlur={commit}
                                placeholder="λ"
                                className="ui-input rounded-lg px-2 py-1 text-sm w-28 min-w-0 font-mono uppercase"
                            />
                            <span className="ui-panel-muted text-xs select-none">push</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AutomatonLabelEditor;
