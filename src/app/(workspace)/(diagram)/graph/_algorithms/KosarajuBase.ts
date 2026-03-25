import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

/**
 * Kosaraju's algorithm for SCC detection + base identification.
 *
 * A "base" of a digraph is the set of SCCs with in-degree 0 in the
 * condensation DAG — i.e., the minimal set of vertices from which every
 * other vertex in the graph is reachable.
 *
 * Phases:
 *  1. DFS on the original graph — push nodes to a stack in finish order.
 *  2. Transpose the graph.
 *  3. DFS on the transposed graph in stack order — each DFS tree = one SCC.
 *  4. Build condensation, find source SCCs (in-degree 0) → these are the bases.
 */
export function runKosarajuBase(
    nodes: GraphNode[],
    edges: GraphEdge[],
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // ── Adjacency lists ────────────────────────────────────────────────────────
    const adj  = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId }[]>();
    const adjT = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId }[]>(); // transposed
    for (const n of nodes) { adj.set(n.id, []); adjT.set(n.id, []); }
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id });
        adjT.get(e.target)!.push({ neighborId: e.source, edgeId: e.id });
    }

    const label = (id: NodeId) => nodeMap.get(id)?.label ?? id;

    steps.push({
        visitedNodes: new Set(),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: 'Kosaraju — fase 1: DFS no grafo original (ordem de término)',
    });

    // ── Phase 1: iterative DFS on original graph, build finish-order stack ────
    const visited1 = new Set<NodeId>();
    const finishStack: NodeId[] = [];
    const phase1Edges = new Set<EdgeId>();

    type Frame = { nodeId: NodeId; neighborIdx: number };

    for (const startNode of nodes) {
        if (visited1.has(startNode.id)) continue;

        visited1.add(startNode.id);
        steps.push({
            visitedNodes: new Set(visited1),
            activeNode: startNode.id,
            visitedEdges: new Set(phase1Edges),
            activeEdge: undefined,
            message: `Fase 1 — visitando ${label(startNode.id)}`,
        });

        const stack: Frame[] = [{ nodeId: startNode.id, neighborIdx: 0 }];

        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            const { nodeId: u } = frame;
            const neighbors = adj.get(u) ?? [];
            let pushed = false;

            while (frame.neighborIdx < neighbors.length) {
                const { neighborId: v, edgeId } = neighbors[frame.neighborIdx];
                frame.neighborIdx++;
                if (!visited1.has(v)) {
                    visited1.add(v);
                    phase1Edges.add(edgeId);
                    steps.push({
                        visitedNodes: new Set(visited1),
                        activeNode: v,
                        visitedEdges: new Set(phase1Edges),
                        activeEdge: edgeId,
                        message: `Fase 1 — visitando ${label(v)}`,
                    });
                    stack.push({ nodeId: v, neighborIdx: 0 });
                    pushed = true;
                    break;
                }
            }

            if (!pushed) {
                stack.pop();
                finishStack.push(u);
                steps.push({
                    visitedNodes: new Set(visited1),
                    activeNode: u,
                    visitedEdges: new Set(phase1Edges),
                    activeEdge: undefined,
                    message: `Fase 1 — ${label(u)} concluído (pilha: [${finishStack.map(label).join(', ')}])`,
                });
            }
        }
    }

    // ── Phase 2: announce transposition ───────────────────────────────────────
    steps.push({
        visitedNodes: new Set(visited1),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: 'Fase 2 — grafo transposto; processando na ordem inversa de término',
    });

    // ── Phase 3: iterative DFS on transposed graph in reverse finish order ────
    const visited3 = new Set<NodeId>();
    const sccOf = new Map<NodeId, number>(); // node → scc index
    const sccs: NodeId[][] = [];
    const phase3Edges = new Set<EdgeId>();
    const allSCCNodes = new Set<NodeId>();

    while (finishStack.length > 0) {
        const root = finishStack.pop()!;
        if (visited3.has(root)) continue;

        // Collect this SCC
        const scc: NodeId[] = [];
        visited3.add(root);
        const stack2: Frame[] = [{ nodeId: root, neighborIdx: 0 }];

        steps.push({
            visitedNodes: new Set(allSCCNodes),
            activeNode: root,
            visitedEdges: new Set(phase3Edges),
            activeEdge: undefined,
            message: `Fase 3 — DFS transposto a partir de ${label(root)}`,
        });

        while (stack2.length > 0) {
            const frame = stack2[stack2.length - 1];
            const { nodeId: u } = frame;
            const neighbors = adjT.get(u) ?? [];
            let pushed = false;

            while (frame.neighborIdx < neighbors.length) {
                const { neighborId: v, edgeId } = neighbors[frame.neighborIdx];
                frame.neighborIdx++;
                if (!visited3.has(v)) {
                    visited3.add(v);
                    phase3Edges.add(edgeId);
                    steps.push({
                        visitedNodes: new Set(allSCCNodes),
                        activeNode: v,
                        visitedEdges: new Set(phase3Edges),
                        activeEdge: edgeId,
                        message: `Fase 3 — visitando ${label(v)}`,
                    });
                    stack2.push({ nodeId: v, neighborIdx: 0 });
                    pushed = true;
                    break;
                }
            }

            if (!pushed) {
                stack2.pop();
                scc.push(u);
            }
        }

        const sccIdx = sccs.length;
        sccs.push(scc);
        for (const n of scc) { sccOf.set(n, sccIdx); allSCCNodes.add(n); }

        const sccLabels = scc.map(label).join(', ');
        steps.push({
            visitedNodes: new Set(allSCCNodes),
            activeNode: root,
            visitedEdges: new Set(phase3Edges),
            activeEdge: undefined,
            message: scc.length === 1
                ? `SCC trivial: ${sccLabels}`
                : `SCC encontrada: {${sccLabels}}`,
        });
    }

    // ── Phase 4: identify base SCCs (in-degree 0 in condensation) ─────────────
    const condensationInDeg = new Array<number>(sccs.length).fill(0);
    for (const e of edges) {
        const su = sccOf.get(e.source)!;
        const sv = sccOf.get(e.target)!;
        if (su !== sv) condensationInDeg[sv]++;
    }

    const baseIndices = new Set(
        condensationInDeg.map((d, i) => ({ d, i })).filter(({ d }) => d === 0).map(({ i }) => i)
    );

    // Collect base nodes and their internal edges
    const baseNodes = new Set<NodeId>();
    for (const [nid, idx] of sccOf) {
        if (baseIndices.has(idx)) baseNodes.add(nid);
    }
    const baseEdges = new Set<EdgeId>();
    for (const e of edges) {
        if (baseNodes.has(e.source) && baseNodes.has(e.target)) baseEdges.add(e.id);
    }

    const baseLabels = [...baseIndices]
        .map((i) => {
            const members = sccs[i].map(label).join(', ');
            return sccs[i].length === 1 ? members : `{${members}}`;
        })
        .join(', ');

    steps.push({
        visitedNodes: baseNodes,
        activeNode: undefined,
        visitedEdges: baseEdges,
        activeEdge: undefined,
        message: baseIndices.size === 1
            ? `Base: ${baseLabels} — fecho transitivo direto = todos os vértices`
            : `${baseIndices.size} componentes de base: ${baseLabels} — necessário um vértice de cada para alcançar todo o grafo`,
    });

    return steps;
}
