import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useGraphContext } from '../context/GraphContext';
import { useWorkspaceContext } from '../../../context/WorkspaceContext';

interface LabelEditorProps {
    svgRef: RefObject<SVGSVGElement | null>;
}

const LabelEditor = ({ svgRef }: LabelEditorProps) => {
    const { state, dispatch } = useGraphContext();
    const { viewOffset, zoom } = useWorkspaceContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');
    const cancelledRef = useRef(false);
    const committedRef = useRef(false);

    const editingNode = state.editingNodeId ? state.nodes[state.editingNodeId] : null;
    const editingEdge = state.editingEdgeId ? state.edges[state.editingEdgeId] : null;
    const isEditing = !!(editingNode || editingEdge);

    // Reset editor state and seed value whenever the editing target changes.
    // editingNode / editingEdge are derived from state, and the reducer clears
    // editingNodeId on commit, so they won't mutate while the editor is open.
    useEffect(() => {
        cancelledRef.current = false;
        committedRef.current = false;
        if (editingNode) {
            setValue(editingNode.label);
        } else if (editingEdge) {
            setValue(
                Number.isInteger(editingEdge.weight)
                    ? String(editingEdge.weight)
                    : editingEdge.weight.toFixed(2)
            );
        }
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

    if (!isEditing) return null;

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return null;

    let screenX = 0;
    let screenY = 0;

    if (editingNode) {
        screenX = svgRect.left + editingNode.x * zoom + viewOffset.x;
        screenY = svgRect.top + editingNode.y * zoom + viewOffset.y;
    } else if (editingEdge) {
        const src = state.nodes[editingEdge.source];
        const tgt = state.nodes[editingEdge.target];
        if (!src || !tgt) return null;
        screenX = svgRect.left + ((src.x + tgt.x) / 2) * zoom + viewOffset.x;
        screenY = svgRect.top + ((src.y + tgt.y) / 2) * zoom + viewOffset.y;
    }

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
            style={{ left: screenX, top: screenY - 56 }}
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
