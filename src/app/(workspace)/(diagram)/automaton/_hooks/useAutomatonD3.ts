import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import * as d3 from 'd3';
import type {
    AutomatonEditorState,
    AutomatonAction,
    AutomatonState,
    AutomatonTransition,
} from '../_types/automaton';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATE_RADIUS = 22;
const OUTER_RING_RADIUS = 28;
const ARROW_LENGTH = 12;
const INITIAL_ARROW_START = STATE_RADIUS + 34; // distance from center where incoming arrow starts
const CURVE_OFFSET = 22; // perpendicular offset for curved transitions

let _stateCounter = 0;
let _transitionCounter = 0;

export function generateStateId(): string {
    return `s${++_stateCounter}`;
}

export function generateTransitionId(): string {
    return `t${++_transitionCounter}`;
}

function snap(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

// ── Geometry helpers ───────────────────────────────────────────────────────────

interface TransitionGeometry {
    path: string;
    labelX: number;
    labelY: number;
}

/** Arc above the state for self-loops. */
function computeSelfLoopGeometry(cx: number, cy: number): TransitionGeometry {
    const SR = STATE_RADIUS;
    const startX = cx + 8;
    const startY = cy - SR;
    const endX = cx - 8;
    const endY = cy - SR;
    const cp1X = cx + 50;
    const cp1Y = cy - SR - 50;
    const cp2X = cx - 50;
    const cp2Y = cy - SR - 50;
    return {
        path: `M ${startX} ${startY} C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${endX} ${endY}`,
        labelX: cx,
        labelY: cy - SR - 62,
    };
}

/**
 * Straight or curved path between two distinct states.
 * curveOffset = 0 → straight, ± → quadratic bezier offset perpendicular to the line.
 */
function computeTransitionGeometry(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    curveOffset: number,
): TransitionGeometry | null {
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < STATE_RADIUS * 2) return null;

    const ux = dx / len;
    const uy = dy / len;
    const px = -uy; // perpendicular (left)
    const py = ux;

    const x1 = sx + STATE_RADIUS * ux;
    const y1 = sy + STATE_RADIUS * uy;
    const x2 = tx - (STATE_RADIUS + ARROW_LENGTH) * ux;
    const y2 = ty - (STATE_RADIUS + ARROW_LENGTH) * uy;

    if (curveOffset === 0) {
        const labelX = (sx + tx) / 2 - uy * 16;
        const labelY = (sy + ty) / 2 + ux * 16;
        return { path: `M ${x1} ${y1} L ${x2} ${y2}`, labelX, labelY };
    }

    const midX = (sx + tx) / 2 + curveOffset * px;
    const midY = (sy + ty) / 2 + curveOffset * py;
    return {
        path: `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`,
        labelX: midX,
        labelY: midY,
    };
}

/**
 * For each transition, determine the perpendicular curveOffset to use.
 * Rules:
 *   - Self-loop: handled separately (curveOffset ignored).
 *   - Single transition (A→B), no reverse (B→A): straight (offset 0).
 *   - Single transition (A→B), reverse (B→A) exists: curve (+CURVE_OFFSET).
 *   - Multiple transitions between same (A→B): distribute offsets symmetrically.
 */
function computeCurveOffsets(
    transitions: AutomatonTransition[],
): Map<string, number> {
    const offsets = new Map<string, number>();

    // Group by ordered pair key
    const groups = new Map<string, string[]>(); // key "(src,tgt)" → [transitionId...]
    for (const t of transitions) {
        if (t.source === t.target) continue; // self-loops handled separately
        const key = `${t.source}→${t.target}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(t.id);
    }

    for (const [key, ids] of groups.entries()) {
        const [src, tgt] = key.split('→');
        const reverseKey = `${tgt}→${src}`;
        const hasReverse = groups.has(reverseKey);

        if (ids.length === 1) {
            // Single transition; curve only if reverse exists
            offsets.set(ids[0], hasReverse ? CURVE_OFFSET : 0);
        } else {
            // Multiple parallel transitions: distribute evenly
            const total = ids.length;
            const step = CURVE_OFFSET * 1.4;
            const startOffset = -((total - 1) * step) / 2;
            ids.forEach((id, i) => {
                offsets.set(id, startOffset + i * step);
            });
        }
    }

    return offsets;
}

// ── Viewport state type ────────────────────────────────────────────────────────

interface AutomatonViewportState {
    viewOffset: { x: number; y: number };
    zoom: number;
    viewportSize: { width: number; height: number };
}

interface AutomatonD3Options {
    isPanModeActiveRef: RefObject<boolean>;
    isPanningRef: RefObject<boolean>;
}

type DragPointerEvent = { button: number; x: number; y: number };

// ── Main hook ──────────────────────────────────────────────────────────────────

export function useAutomatonD3(
    svgRef: RefObject<SVGSVGElement | null>,
    state: AutomatonEditorState,
    dispatch: React.Dispatch<AutomatonAction>,
    viewport: AutomatonViewportState,
    options: AutomatonD3Options,
): void {
    const { isPanModeActiveRef, isPanningRef } = options;

    const stateRef = useRef(state);
    const dispatchRef = useRef(dispatch);
    useEffect(() => { stateRef.current = state; });
    useEffect(() => { dispatchRef.current = dispatch; });

    const dragMovedRef = useRef(false);
    const dragPreviewRef = useRef<Record<string, { x: number; y: number }>>({});

    // ── Setup (once on mount) ──────────────────────────────────────────────────
    useEffect(() => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        svg.on('contextmenu', (event: Event) => event.preventDefault());

        // ── Defs ──────────────────────────────────────────────────────────────
        const defs = svg.append('defs');

        defs.append('marker')
            .attr('id', 'automaton-arrow')
            .attr('viewBox', '0 -6 12 12')
            .attr('refX', 12)
            .attr('refY', 0)
            .attr('markerWidth', ARROW_LENGTH)
            .attr('markerHeight', ARROW_LENGTH)
            .attr('orient', 'auto')
            .attr('markerUnits', 'userSpaceOnUse')
            .append('path')
            .attr('d', 'M0,-6L12,0L0,6Z')
            .style('fill', 'context-stroke');

        // ── Layers ────────────────────────────────────────────────────────────
        svg.append('g').attr('class', 'transitions-layer');
        svg.append('g').attr('class', 'states-layer');

        // ── Transition-creation preview line ──────────────────────────────────
        svg.append('line')
            .attr('class', 'transition-preview')
            .style('display', 'none');

        // ── SVG-level pointer events ───────────────────────────────────────────
        svg.on('pointerup', (event: PointerEvent) => {
            if (event.button !== 0) return;
            if (isPanningRef.current) return;
            if ((event.target as Element).closest('.state-group, .transition-group')) return;
            if (dragMovedRef.current) return;
            const s = stateRef.current;
            if (s.transitionSourceId) {
                dispatchRef.current({ type: 'CANCEL_TRANSITION' });
                return;
            }
            dispatchRef.current({ type: 'SELECT_STATE', id: null });
            dispatchRef.current({ type: 'SELECT_TRANSITION', id: null });
        });

        svg.on('dblclick', (event: MouseEvent) => {
            if ((event.target as Element).closest('.state-group, .transition-group')) return;
            event.preventDefault();
            const [x, y] = d3.pointer(event, svgEl);
            const s = stateRef.current;
            const nx = s.snapToGrid ? snap(x, s.gridSize) : x;
            const ny = s.snapToGrid ? snap(y, s.gridSize) : y;
            const id = generateStateId();
            const stateCount = Object.keys(s.states).length;
            dispatchRef.current({
                type: 'ADD_STATE',
                state: {
                    id,
                    x: nx,
                    y: ny,
                    label: `q${stateCount}`,
                    isInitial: stateCount === 0, // first state is initial by default
                    isFinal: false,
                },
            });
        });

        svg.on('mousemove', (event: MouseEvent) => {
            const s = stateRef.current;
            if (!s.transitionSourceId) return;
            const src = s.states[s.transitionSourceId];
            if (!src) return;
            const [mx, my] = d3.pointer(event, svgEl);
            svg.select('.transition-preview')
                .style('display', null)
                .attr('x1', src.x)
                .attr('y1', src.y)
                .attr('x2', mx)
                .attr('y2', my);
        });

        // ── Keyboard shortcuts ─────────────────────────────────────────────────
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                dispatchRef.current({ type: 'CANCEL_TRANSITION' });
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                const s = stateRef.current;
                if (s.editingStateId || s.editingTransitionId) return;
                if (s.selectedStateId) {
                    dispatchRef.current({ type: 'DELETE_STATE', id: s.selectedStateId });
                } else if (s.selectedTransitionId) {
                    dispatchRef.current({ type: 'DELETE_TRANSITION', id: s.selectedTransitionId });
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render (runs on every state change) ────────────────────────────────────
    useEffect(() => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        const svg = d3.select(svgEl);
        const {
            states,
            transitions,
            selectedStateId,
            selectedTransitionId,
            transitionSourceId,
            simulationSteps,
            simulationCurrentStep,
            automatonType,
        } = state;
        const currentSimStep = simulationSteps[simulationCurrentStep];

        const getTransitionLabel = (t: AutomatonTransition): string => {
            if (automatonType === 'PUSHDOWN') {
                const pop = t.stackPop || 'λ';
                const push = t.stackPush || 'λ';
                return `${t.symbol} <${pop}/${push}>`;
            }
            return t.symbol;
        };

        const { viewOffset, zoom, viewportSize } = viewport;
        const statesArray = Object.values(states);
        const transitionsArray = Object.values(transitions);

        const viewBoxWidth = Math.max(1, viewportSize.width / zoom);
        const viewBoxHeight = Math.max(1, viewportSize.height / zoom);
        const viewBoxX = Math.max(0, -viewOffset.x / zoom);
        const viewBoxY = Math.max(0, -viewOffset.y / zoom);

        const getStatePosition = (id: string) => dragPreviewRef.current[id] ?? states[id] ?? null;

        // Clean up stale drag previews
        for (const [sid, preview] of Object.entries(dragPreviewRef.current)) {
            const s = states[sid];
            if (s && s.x === preview.x && s.y === preview.y) {
                delete dragPreviewRef.current[sid];
            }
        }

        svg.attr('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        if (!transitionSourceId) {
            svg.select('.transition-preview').style('display', 'none');
        }

        // ── Curve offsets ──────────────────────────────────────────────────────
        const curveOffsets = computeCurveOffsets(transitionsArray);

        // ── Drag behaviour ─────────────────────────────────────────────────────
        const drag = d3
            .drag()
            .filter((event: PointerEvent) => event.button === 0 && !isPanModeActiveRef.current)
            .clickDistance(6)
            .subject((_: unknown, d: AutomatonState) => ({ x: d.x, y: d.y }))
            .on('start', function (this: SVGGElement) {
                dragMovedRef.current = false;
                const datum = d3.select(this).datum() as AutomatonState | undefined;
                if (datum) dragPreviewRef.current[datum.id] = { x: datum.x, y: datum.y };
                d3.select(this).raise();
            })
            .on('drag', function (this: SVGGElement, event: DragPointerEvent, d: AutomatonState) {
                dragMovedRef.current = true;
                const s = stateRef.current;
                const nx = s.snapToGrid ? snap(event.x, s.gridSize) : event.x;
                const ny = s.snapToGrid ? snap(event.y, s.gridSize) : event.y;
                dragPreviewRef.current[d.id] = { x: nx, y: ny };
                d3.select(this).attr('transform', `translate(${nx},${ny})`);

                // Live-update connected transitions
                const offsets = computeCurveOffsets(Object.values(stateRef.current.transitions));
                svg.selectAll('g.transition-group').each(function (this: SVGGElement, td: AutomatonTransition) {
                    if (td.source !== d.id && td.target !== d.id) return;
                    const srcPos = td.source === d.id ? { x: nx, y: ny } : getStatePosition(td.source);
                    const tgtPos = td.target === d.id ? { x: nx, y: ny } : getStatePosition(td.target);
                    if (!srcPos || !tgtPos) return;
                    const g = d3.select(this);
                    let geo: TransitionGeometry | null;
                    if (td.source === td.target) {
                        geo = computeSelfLoopGeometry(nx, ny);
                    } else {
                        geo = computeTransitionGeometry(srcPos.x, srcPos.y, tgtPos.x, tgtPos.y, offsets.get(td.id) ?? 0);
                    }
                    if (!geo) return;
                    g.select('.transition-hit-area').attr('d', geo.path);
                    g.select('.transition-line').attr('d', geo.path);
                    g.select('.transition-label').attr('x', geo.labelX).attr('y', geo.labelY);
                });
            })
            .on('end', function (this: SVGGElement, event: DragPointerEvent, d: AutomatonState) {
                if (dragMovedRef.current) {
                    const s = stateRef.current;
                    const nx = s.snapToGrid ? snap(event.x, s.gridSize) : event.x;
                    const ny = s.snapToGrid ? snap(event.y, s.gridSize) : event.y;
                    dragPreviewRef.current[d.id] = { x: nx, y: ny };
                    dispatchRef.current({ type: 'MOVE_STATE', id: d.id, x: nx, y: ny });
                } else {
                    delete dragPreviewRef.current[d.id];
                }
                dragMovedRef.current = false;
            });

        // ── Transitions ────────────────────────────────────────────────────────
        const transitionsLayer = svg.select('.transitions-layer');
        const transitionGroups = transitionsLayer
            .selectAll('g.transition-group')
            .data(transitionsArray, (d: AutomatonTransition) => d.id);

        const transitionEnter = transitionGroups
            .enter()
            .append('g')
            .attr('class', 'transition-group');

        transitionEnter.append('path').attr('class', 'transition-hit-area');
        transitionEnter.append('path').attr('class', 'transition-line');
        transitionEnter
            .append('text')
            .attr('class', 'transition-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle');

        const transitionUpdate = transitionEnter.merge(transitionGroups);

        transitionUpdate.on('click', function (event: MouseEvent, d: AutomatonTransition) {
            event.stopPropagation();
            if (stateRef.current.transitionSourceId) return;
            dispatchRef.current({ type: 'SELECT_TRANSITION', id: d.id });
        });

        transitionUpdate.on('dblclick', function (event: MouseEvent, d: AutomatonTransition) {
            event.stopPropagation();
            dispatchRef.current({ type: 'SET_EDITING_TRANSITION', id: d.id });
        });

        // Update transition geometry and classes
        transitionUpdate.each(function (this: SVGGElement, d: AutomatonTransition) {
            const src = getStatePosition(d.source);
            const tgt = getStatePosition(d.target);
            if (!src || !tgt) return;

            let geo: TransitionGeometry | null;
            if (d.source === d.target) {
                geo = computeSelfLoopGeometry(src.x, src.y);
            } else {
                geo = computeTransitionGeometry(src.x, src.y, tgt.x, tgt.y, curveOffsets.get(d.id) ?? 0);
            }
            if (!geo) return;

            const g = d3.select(this);
            g.select('.transition-hit-area').attr('d', geo.path);
            g.select('.transition-line').attr('d', geo.path);
            g.select('.transition-label').attr('x', geo.labelX).attr('y', geo.labelY).text(getTransitionLabel(d));
        });

        transitionUpdate.select('.transition-line').attr('class', (d: AutomatonTransition) => {
            const parts = ['transition-line'];
            if (d.id === selectedTransitionId) parts.push('transition-selected');
            if (d.symbol === 'λ' || d.symbol === 'ε') parts.push('transition-lambda');
            if (currentSimStep?.activeTransitionIds.has(d.id)) parts.push('transition-sim-active');
            return parts.join(' ');
        });
        transitionUpdate.select('.transition-line').attr('marker-end', 'url(#automaton-arrow)');

        transitionGroups.exit().remove();

        // ── States ─────────────────────────────────────────────────────────────
        const statesLayer = svg.select('.states-layer');
        const stateGroups = statesLayer
            .selectAll('g.state-group')
            .data(statesArray, (d: AutomatonState) => d.id);

        const stateEnter = stateGroups.enter().append('g').attr('class', 'state-group');

        // Outer ring (only visible when isFinal)
        stateEnter.append('circle').attr('class', 'state-outer-ring').attr('r', OUTER_RING_RADIUS);
        // Main circle
        stateEnter.append('circle').attr('class', 'state-circle').attr('r', STATE_RADIUS);
        // Label
        stateEnter
            .append('text')
            .attr('class', 'state-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle');
        // Initial state arrow (line + arrowhead, shown when isInitial)
        stateEnter
            .append('line')
            .attr('class', 'state-initial-arrow')
            .attr('x1', -INITIAL_ARROW_START)
            .attr('y1', 0)
            .attr('x2', -(STATE_RADIUS + ARROW_LENGTH))
            .attr('y2', 0)
            .attr('marker-end', 'url(#automaton-arrow)');

        const stateUpdate = stateEnter.merge(stateGroups);

        stateUpdate.call(drag);

        stateUpdate.on('pointerup', function (event: PointerEvent, d: AutomatonState) {
            if (event.button !== 0) return;
            event.stopPropagation();
            if (dragMovedRef.current) return;
            const s = stateRef.current;
            if (s.transitionSourceId) {
                if (s.transitionSourceId !== d.id || true) {
                    // Allow self-loops (source === target)
                    dispatchRef.current({ type: 'SET_PENDING_TRANSITION_TARGET', id: d.id });
                }
                return;
            }
            dispatchRef.current({ type: 'SELECT_STATE', id: d.id });
        });

        stateUpdate.on('dblclick', function (event: MouseEvent, d: AutomatonState) {
            event.stopPropagation();
            dispatchRef.current({ type: 'SET_EDITING_STATE', id: d.id });
        });

        stateUpdate.on('contextmenu', function (event: MouseEvent, d: AutomatonState) {
            event.preventDefault();
            event.stopPropagation();
            const s = stateRef.current;
            if (!s.transitionSourceId) {
                dispatchRef.current({ type: 'START_TRANSITION_FROM', id: d.id });
            } else {
                dispatchRef.current({ type: 'SET_PENDING_TRANSITION_TARGET', id: d.id });
            }
        });

        // Update transforms
        stateUpdate.attr('transform', (d: AutomatonState) => {
            const pos = getStatePosition(d.id) ?? d;
            return `translate(${pos.x},${pos.y})`;
        });

        // Outer ring visibility (final state)
        stateUpdate.select('.state-outer-ring').style('display', (d: AutomatonState) =>
            d.isFinal ? null : 'none'
        );

        // Circle classes
        stateUpdate.select('.state-circle').attr('class', (d: AutomatonState) => {
            const parts = ['state-circle'];
            if (d.id === selectedStateId) parts.push('state-selected');
            if (d.id === transitionSourceId) parts.push('state-transition-source');
            if (currentSimStep?.activeStates.has(d.id)) {
                if (currentSimStep.isAccepted && d.isFinal) parts.push('state-sim-accepted');
                else parts.push('state-sim-active');
            }
            return parts.join(' ');
        });

        // Labels
        stateUpdate.select('.state-label').text((d: AutomatonState) => d.label);

        // Initial arrow visibility
        stateUpdate.select('.state-initial-arrow').style('display', (d: AutomatonState) =>
            d.isInitial ? null : 'none'
        );

        stateGroups.exit().remove();
    }, [isPanModeActiveRef, state, svgRef, dragMovedRef, viewport]);
}
