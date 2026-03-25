'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useGraphContext } from '../_context/GraphContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

interface LabelEditorProps {
    svgRef: RefObject<SVGSVGElement | null>;
}

const LabelEditor = ({ svgRef }: LabelEditorProps) => {
    const { state, dispatch } = useGraphContext();
    const { viewOffset, zoom } = useWorkspaceContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const cancelledRef = useRef(false);
    const committedRef = useRef(false);

    const editingNode = state.editingNodeId ? state.nodes[state.editingNodeId] : null;
    const editingEdge = state.editingEdgeId ? state.edges[state.editingEdgeId] : null;
    const isEditing = !!(editingNode || editingEdge);

    useEffect(() => {
        const nextValue = editingNode
            ? editingNode.label
            : editingEdge
                ? (Number.isInteger(editingEdge.weight)
                    ? String(editingEdge.weight)
                    : editingEdge.weight.toFixed(2))
                : '';

        cancelledRef.current = false;
        committedRef.current = false;
        const frame = requestAnimationFrame(() => {
            setValue(nextValue);
        });

        return () => cancelAnimationFrame(frame);
    }, [editingNode, editingEdge]);

    // Focus + select on open
    useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            });
        }
    }, [isEditing]);

    const edgeEndpoints = useMemo(() => {
        if (!editingEdge) return null;
        const src = state.nodes[editingEdge.source];
        const tgt = state.nodes[editingEdge.target];
        return src && tgt ? { src, tgt } : null;
    }, [editingEdge, state.nodes]);

    const updatePosition = useCallback(() => {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!isEditing || !svgRect) {
            setPosition(null);
            return;
        }

        if (editingNode) {
            setPosition({
                x: svgRect.left + editingNode.x * zoom + viewOffset.x,
                y: svgRect.top + editingNode.y * zoom + viewOffset.y,
            });
            return;
        }

        if (edgeEndpoints) {
            setPosition({
                x: svgRect.left + ((edgeEndpoints.src.x + edgeEndpoints.tgt.x) / 2) * zoom + viewOffset.x,
                y: svgRect.top + ((edgeEndpoints.src.y + edgeEndpoints.tgt.y) / 2) * zoom + viewOffset.y,
            });
            return;
        }

        setPosition(null);
    }, [edgeEndpoints, editingNode, isEditing, svgRef, viewOffset.x, viewOffset.y, zoom]);

    useEffect(() => {
        let frame = requestAnimationFrame(updatePosition);
        const handleViewportChange = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updatePosition);
        };

        const svgElement = svgRef.current;
        const resizeObserver = typeof ResizeObserver !== 'undefined' && svgElement
            ? new ResizeObserver(handleViewportChange)
            : null;

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);
        if (resizeObserver && svgElement) {
            resizeObserver.observe(svgElement);
        }

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
            resizeObserver?.disconnect();
        };
    }, [svgRef, updatePosition]);

    if (!isEditing || !position) return null;

    const commit = () => {
        if (committedRef.current || cancelledRef.current) return;
        committedRef.current = true;

        if (editingNode) {
            const trimmed = value.trim();
            dispatch({
                type: 'UPDATE_NODE_LABEL',
                id: editingNode.id,
                label: trimmed || editingNode.label,
            });
        } else if (editingEdge) {
            const w = parseFloat(value);
            if (!isNaN(w)) {
                dispatch({ type: 'UPDATE_EDGE', id: editingEdge.id, weight: w });
            } else {
                dispatch({ type: 'SET_EDITING_EDGE', id: null });
            }
        }
    };

    const cancel = () => {
        if (committedRef.current || cancelledRef.current) return;
        cancelledRef.current = true;
        dispatch({ type: 'SET_EDITING_NODE', id: null });
        dispatch({ type: 'SET_EDITING_EDGE', id: null });
    };

    return (
        <div
            className="fixed z-50 -translate-x-1/2"
            style={{ left: position.x, top: position.y - 56 }}
        >
            <div className="ui-floating-card rounded-xl p-2 flex items-center gap-2 shadow-xl">
                <input
                    ref={inputRef}
                    type={editingEdge ? 'number' : 'text'}
                    step={editingEdge ? 'any' : undefined}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') cancel();
                    }}
                    onBlur={commit}
                    placeholder={editingEdge ? 'Peso' : 'Label'}
                    className="ui-input rounded-lg px-2 py-1 text-sm w-28 min-w-0"
                />
                <span className="ui-panel-muted text-xs select-none">
                    {editingEdge ? 'peso' : 'label'}
                </span>
            </div>
        </div>
    );
};

export default LabelEditor;
