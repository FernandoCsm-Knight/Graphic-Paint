import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import * as d3 from 'd3';
import type { GraphState, GraphAction, GraphNode, GraphEdge } from '../_types/graph';

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_RADIUS = 22;
const ARROW_LENGTH = 12;

let _nodeCounter = 0;
let _edgeCounter = 0;

export function generateNodeId(): string {
    return `n${++_nodeCounter}`;
}

export function generateEdgeId(): string {
    return `e${++_edgeCounter}`;
}

function snap(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

// ── Edge geometry helpers ──────────────────────────────────────────────────────

const CURVE_OFFSET = 36; // perpendicular offset for bidirectional edges

interface EdgePathResult {
    d: string;
    labelX: number;
    labelY: number;
}

interface GraphViewportState {
    viewOffset: { x: number; y: number };
    zoom: number;
    viewportSize: { width: number; height: number };
}

type DragPointerEvent = {
    button: number;
    x: number;
    y: number;
};

function computeEdgePath(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    directed: boolean,
    curved: boolean,
): EdgePathResult | null {
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < NODE_RADIUS * 2) return null;
    const ux = dx / len;
    const uy = dy / len;
    // Perpendicular unit vector (left of direction)
    const px = -uy;
    const py = ux;
    const endOffset = directed ? NODE_RADIUS + ARROW_LENGTH : NODE_RADIUS;

    if (!curved) {
        const x1 = sx + NODE_RADIUS * ux;
        const y1 = sy + NODE_RADIUS * uy;
        const x2 = tx - endOffset * ux;
        const y2 = ty - endOffset * uy;
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        return {
            d: `M ${x1},${y1} L ${x2},${y2}`,
            labelX: midX - uy * 14,
            labelY: midY + ux * 14,
        };
    }

    // Quadratic Bézier — control point offset perpendicular to midpoint
    const cx = (sx + tx) / 2 + px * CURVE_OFFSET;
    const cy = (sy + ty) / 2 + py * CURVE_OFFSET;

    // Start: on source circle along S→C tangent
    const scDx = cx - sx;
    const scDy = cy - sy;
    const scLen = Math.sqrt(scDx * scDx + scDy * scDy);
    const x1 = sx + NODE_RADIUS * scDx / scLen;
    const y1 = sy + NODE_RADIUS * scDy / scLen;

    // End: on target circle along C→T tangent
    const ctDx = tx - cx;
    const ctDy = ty - cy;
    const ctLen = Math.sqrt(ctDx * ctDx + ctDy * ctDy);
    const x2 = tx - endOffset * ctDx / ctLen;
    const y2 = ty - endOffset * ctDy / ctLen;

    // Label: at Bézier midpoint (t=0.5), nudged further outward
    const curveMidX = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
    const curveMidY = 0.25 * y1 + 0.5 * cy + 0.25 * y2;

    return {
        d: `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`,
        labelX: curveMidX + px * 14,
        labelY: curveMidY + py * 14,
    };
}

// ── Main hook ──────────────────────────────────────────────────────────────────

interface GraphD3Options {
    isPanModeActiveRef: RefObject<boolean>;
    isPanningRef: RefObject<boolean>;
}

export function useGraphD3(
    svgRef: RefObject<SVGSVGElement | null>,
    state: GraphState,
    dispatch: React.Dispatch<GraphAction>,
    viewport: GraphViewportState,
    options: GraphD3Options,
): void {
    const { isPanModeActiveRef, isPanningRef } = options;

    // Always-fresh refs to avoid stale closures in D3 callbacks
    const stateRef = useRef(state);
    const dispatchRef = useRef(dispatch);
    useEffect(() => {
        stateRef.current = state;
    });
    useEffect(() => {
        dispatchRef.current = dispatch;
    });

    const dragMovedRef = useRef(false);
    const dragPreviewRef = useRef<Record<string, { x: number; y: number }>>({});

    // ── Setup (once on mount) ──────────────────────────────────────────────────
    useEffect(() => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        // Prevent browser context menu everywhere on the SVG
        svg.on('contextmenu', (event: Event) => event.preventDefault());

        // ── Defs ──────────────────────────────────────────────────────────────
        const defs = svg.append('defs');

        // Arrow-head marker (tip aligns with line endpoint)
        defs.append('marker')
            .attr('id', 'graph-arrow')
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
        svg.append('g').attr('class', 'edges-layer');
        svg.append('g').attr('class', 'nodes-layer');

        // ── Edge-creation preview line ─────────────────────────────────────────
        svg.append('line')
            .attr('class', 'edge-preview')
            .style('display', 'none');

        // ── SVG-level pointer events ───────────────────────────────────────────
        svg.on('pointerup', (event: PointerEvent) => {
            if (event.button !== 0) return;
            if (isPanningRef.current) return;
            if ((event.target as Element).closest('.node-group, .edge-group')) return;
            if (dragMovedRef.current) return;
            const s = stateRef.current;
            if (s.edgeSourceId) {
                dispatchRef.current({ type: 'CANCEL_EDGE' });
                return;
            }
            if (s.selectingFor !== 'none') {
                dispatchRef.current({ type: 'SET_SELECTING_FOR', target: 'none' });
                return;
            }
            dispatchRef.current({ type: 'SELECT_NODE', id: null });
            dispatchRef.current({ type: 'SELECT_EDGE', id: null });
        });

        svg.on('dblclick', (event: MouseEvent) => {
            if ((event.target as Element).closest('.node-group, .edge-group')) return;
            event.preventDefault();
            const [x, y] = d3.pointer(event, svgEl);
            const s = stateRef.current;
            const nx = s.snapToGrid ? snap(x, s.gridSize) : x;
            const ny = s.snapToGrid ? snap(y, s.gridSize) : y;
            const id = generateNodeId();
            dispatchRef.current({
                type: 'ADD_NODE',
                node: { id, x: nx, y: ny, label: `V${id.slice(1)}` },
            });
        });

        svg.on('mousemove', (event: MouseEvent) => {
            const s = stateRef.current;
            if (!s.edgeSourceId) return;
            const src = s.nodes[s.edgeSourceId];
            if (!src) return;
            const [mx, my] = d3.pointer(event, svgEl);
            svg.select('.edge-preview')
                .style('display', null)
                .attr('x1', src.x)
                .attr('y1', src.y)
                .attr('x2', mx)
                .attr('y2', my);
        });

        // ── Keyboard shortcuts ─────────────────────────────────────────────────
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                dispatchRef.current({ type: 'CANCEL_EDGE' });
                dispatchRef.current({ type: 'SET_SELECTING_FOR', target: 'none' });
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                const s = stateRef.current;
                if (s.editingNodeId || s.editingEdgeId) return;
                if (s.selectedNodeId) {
                    dispatchRef.current({ type: 'DELETE_NODE', id: s.selectedNodeId });
                } else if (s.selectedEdgeId) {
                    dispatchRef.current({ type: 'DELETE_EDGE', id: s.selectedEdgeId });
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    // svgRef is a stable ref object — this effect only needs to run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render (runs on every state change) ────────────────────────────────────
    useEffect(() => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        const svg = d3.select(svgEl);
        const {
            nodes,
            edges,
            selectedNodeId,
            selectedEdgeId,
            edgeSourceId,
            directed,
            algorithmSteps,
            currentStepIndex,
            startNodeId,
            endNodeId,
            selectingFor,
        } = state;
        const { viewOffset, zoom, viewportSize } = viewport;

        const currentStep = algorithmSteps[currentStepIndex];
        const nodesArray = Object.values(nodes);
        const edgesArray = Object.values(edges);
        const viewBoxWidth = Math.max(1, viewportSize.width / zoom);
        const viewBoxHeight = Math.max(1, viewportSize.height / zoom);
        const viewBoxX = Math.max(0, -viewOffset.x / zoom);
        const viewBoxY = Math.max(0, -viewOffset.y / zoom);
        const getNodePosition = (id: string) => dragPreviewRef.current[id] ?? nodes[id] ?? null;

        for (const [nodeId, preview] of Object.entries(dragPreviewRef.current)) {
            const node = nodes[nodeId];
            if (node && node.x === preview.x && node.y === preview.y) {
                delete dragPreviewRef.current[nodeId];
            }
        }

        svg.attr('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        // Hide preview when not in edge-creation mode
        if (!edgeSourceId) {
            svg.select('.edge-preview').style('display', 'none');
        }

        // ── Drag behaviour (created fresh each render so refs are captured) ────
        const drag = d3
            .drag()
            .filter((event: PointerEvent) => event.button === 0 && !isPanModeActiveRef.current)
            .clickDistance(6)
            .subject((_: unknown, d: GraphNode) => ({ x: d.x, y: d.y }))
            .on('start', function (this: SVGGElement) {
                dragMovedRef.current = false;
                const datum = d3.select(this).datum() as GraphNode | undefined;
                if (datum) {
                    dragPreviewRef.current[datum.id] = { x: datum.x, y: datum.y };
                }
                d3.select(this).raise();
            })
            .on('drag', function (this: SVGGElement, event: DragPointerEvent, d: GraphNode) {
                dragMovedRef.current = true;
                const s = stateRef.current;
                const nx = s.snapToGrid ? snap(event.x, s.gridSize) : event.x;
                const ny = s.snapToGrid ? snap(event.y, s.gridSize) : event.y;
                dragPreviewRef.current[d.id] = { x: nx, y: ny };

                d3.select(this).attr('transform', `translate(${nx},${ny})`);

                // Build twin-pair set from current state for curve detection
                const allEdges = Object.values(s.edges);
                const pairKeys = new Set(allEdges.map((e) => `${e.source}>${e.target}`));
                const isCurvedDrag = (e: GraphEdge) =>
                    s.directed && pairKeys.has(`${e.target}>${e.source}`);

                // Live-update connected edges without touching React state
                svg.selectAll('g.edge-group').each(function (this: SVGGElement, ed: GraphEdge) {
                    if (ed.source !== d.id && ed.target !== d.id) return;
                    const sx2 = ed.source === d.id ? nx : (s.nodes[ed.source]?.x ?? 0);
                    const sy2 = ed.source === d.id ? ny : (s.nodes[ed.source]?.y ?? 0);
                    const tx2 = ed.target === d.id ? nx : (s.nodes[ed.target]?.x ?? 0);
                    const ty2 = ed.target === d.id ? ny : (s.nodes[ed.target]?.y ?? 0);
                    const ep = computeEdgePath(sx2, sy2, tx2, ty2, s.directed, isCurvedDrag(ed));
                    if (!ep) return;
                    const g = d3.select(this);
                    g.select('.edge-hit-area').attr('d', ep.d);
                    g.select('.edge-line').attr('d', ep.d);
                    g.select('.edge-label').attr('x', ep.labelX).attr('y', ep.labelY);
                });
            })
            .on('end', function (this: SVGGElement, event: DragPointerEvent, d: GraphNode) {
                if (dragMovedRef.current) {
                    const s = stateRef.current;
                    const nx = s.snapToGrid ? snap(event.x, s.gridSize) : event.x;
                    const ny = s.snapToGrid ? snap(event.y, s.gridSize) : event.y;
                    dragPreviewRef.current[d.id] = { x: nx, y: ny };
                    dispatchRef.current({ type: 'MOVE_NODE', id: d.id, x: nx, y: ny });
                } else {
                    delete dragPreviewRef.current[d.id];
                }
                dragMovedRef.current = false;
            });

        // ── Edges ──────────────────────────────────────────────────────────────

        // Detect bidirectional pairs — both directions curve away from the center line
        const pairKeys = new Set(edgesArray.map((e) => `${e.source}>${e.target}`));
        const isCurved = (e: GraphEdge) =>
            directed && pairKeys.has(`${e.target}>${e.source}`);

        const edgesLayer = svg.select('.edges-layer');
        const edgeGroups = edgesLayer
            .selectAll('g.edge-group')
            .data(edgesArray, (d: GraphEdge) => d.id);

        const edgeEnter = edgeGroups
            .enter()
            .append('g')
            .attr('class', 'edge-group');

        edgeEnter.append('path').attr('class', 'edge-hit-area');
        edgeEnter.append('path').attr('class', 'edge-line');
        edgeEnter.append('text')
            .attr('class', 'edge-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle');

        const edgeUpdate = edgeEnter.merge(edgeGroups);

        // Click / dblclick handlers on all edge groups
        edgeUpdate.on('click', function (event: MouseEvent, d: GraphEdge) {
            event.stopPropagation();
            if (stateRef.current.edgeSourceId) return;
            dispatchRef.current({ type: 'SELECT_EDGE', id: d.id });
        });
        edgeUpdate.on('dblclick', function (event: MouseEvent, d: GraphEdge) {
            event.stopPropagation();
            dispatchRef.current({ type: 'SET_EDITING_EDGE', id: d.id });
        });

        // Update geometry and visual classes
        edgeUpdate.each(function (this: SVGGElement, d: GraphEdge) {
            const src = getNodePosition(d.source);
            const tgt = getNodePosition(d.target);
            if (!src || !tgt) return;
            const ep = computeEdgePath(src.x, src.y, tgt.x, tgt.y, directed, isCurved(d));
            if (!ep) return;
            const g = d3.select(this);
            g.select('.edge-hit-area').attr('d', ep.d);
            g.select('.edge-line').attr('d', ep.d);
            g.select('.edge-label')
                .attr('x', ep.labelX)
                .attr('y', ep.labelY)
                .text(() => {
                    const w = d.weight;
                    return Number.isInteger(w) ? String(w) : w.toFixed(2);
                });
        });

        edgeUpdate.select('.edge-line')
            .attr('class', (d: GraphEdge) => {
                const parts = ['edge-line'];
                if (d.id === selectedEdgeId) parts.push('edge-selected');
                if (currentStep?.visitedEdges.has(d.id)) parts.push('edge-visited');
                if (currentStep?.activeEdge === d.id) parts.push('edge-active');
                return parts.join(' ');
            })
            .attr('marker-end', directed ? 'url(#graph-arrow)' : null);

        edgeGroups.exit().remove();

        // ── Nodes ──────────────────────────────────────────────────────────────
        const nodesLayer = svg.select('.nodes-layer');
        const nodeGroups = nodesLayer
            .selectAll('g.node-group')
            .data(nodesArray, (d: GraphNode) => d.id);

        const nodeEnter = nodeGroups
            .enter()
            .append('g')
            .attr('class', 'node-group');

        nodeEnter.append('circle').attr('class', 'node-circle').attr('r', NODE_RADIUS);
        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle');
        nodeEnter.append('text')
            .attr('class', 'node-badge')
            .attr('text-anchor', 'middle')
            .attr('dy', -(NODE_RADIUS + 8));

        const nodeUpdate = nodeEnter.merge(nodeGroups);

        // Apply drag to all nodes
        nodeUpdate.call(drag);

        // Event handlers on all nodes (re-attached each render; handlers use stateRef so always fresh)
        // Use pointerup instead of click: D3 v7 suppresses click events via capture-phase listener
        // after any drag, but pointerup fires before that suppression kicks in.
        nodeUpdate.on('pointerup', function (event: PointerEvent, d: GraphNode) {
            if (event.button !== 0) return;
            event.stopPropagation();
            if (dragMovedRef.current) return;
            const s = stateRef.current;

            if (s.selectingFor === 'startNode') {
                dispatchRef.current({ type: 'SET_START_NODE', id: d.id });
                return;
            }
            if (s.selectingFor === 'endNode') {
                dispatchRef.current({ type: 'SET_END_NODE', id: d.id });
                return;
            }
            if (s.edgeSourceId) return;
            dispatchRef.current({ type: 'SELECT_NODE', id: d.id });
        });

        nodeUpdate.on('dblclick', function (event: MouseEvent, d: GraphNode) {
            event.stopPropagation();
            dispatchRef.current({ type: 'SET_EDITING_NODE', id: d.id });
        });

        nodeUpdate.on('contextmenu', function (event: MouseEvent, d: GraphNode) {
            event.preventDefault();
            event.stopPropagation();
            const s = stateRef.current;
            if (!s.edgeSourceId) {
                dispatchRef.current({ type: 'START_EDGE_FROM', id: d.id });
            } else if (s.edgeSourceId === d.id) {
                dispatchRef.current({ type: 'CANCEL_EDGE' });
            } else {
                const edgeId = generateEdgeId();
                dispatchRef.current({
                    type: 'ADD_EDGE',
                    edge: { id: edgeId, source: s.edgeSourceId, target: d.id, weight: 1 },
                });
            }
        });

        // Update transforms
        nodeUpdate.attr('transform', (d: GraphNode) => {
            const position = getNodePosition(d.id) ?? d;
            return `translate(${position.x},${position.y})`;
        });

        // Update circle class
        nodeUpdate.select('.node-circle').attr('class', (d: GraphNode) => {
            const parts = ['node-circle'];
            if (d.id === selectedNodeId) parts.push('node-selected');
            if (d.id === startNodeId) parts.push('node-start');
            if (d.id === endNodeId) parts.push('node-end');
            if (d.id === edgeSourceId) parts.push('node-edge-source');
            if (currentStep?.activeNode === d.id) parts.push('node-active');
            else if (currentStep?.visitedNodes.has(d.id)) parts.push('node-visited');
            if (selectingFor !== 'none') parts.push('node-selectable');
            return parts.join(' ');
        });

        // Update labels
        nodeUpdate.select('.node-label').text((d: GraphNode) => d.label);

        // Update start/end badges
        nodeUpdate.select('.node-badge').text((d: GraphNode) => {
            const parts: string[] = [];
            if (d.id === startNodeId) parts.push('S');
            if (d.id === endNodeId) parts.push('E');
            return parts.join('/');
        });


        nodeGroups.exit().remove();
    }, [isPanModeActiveRef, state, svgRef, dragMovedRef, viewport]);
}
