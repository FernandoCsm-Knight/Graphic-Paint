import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

// Iterative Tarjan SCC — translated from the user's C++ implementation
export function runTarjanSCC(
    nodes: GraphNode[],
    edges: GraphEdge[],
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // Directed adjacency list
    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id });
    }

    let id = 0;
    const ids = new Map<NodeId, number>();
    const lowLink = new Map<NodeId, number>();
    const onStack = new Map<NodeId, boolean>();

    for (const n of nodes) {
        ids.set(n.id, -1);
        lowLink.set(n.id, -1);
        onStack.set(n.id, false);
    }

    const sccStack: NodeId[] = [];       // Tarjan's auxiliary stack
    const allSCCNodes = new Set<NodeId>(); // nodes that have been assigned to an SCC
    const visitedEdges = new Set<EdgeId>();
    const components: NodeId[][] = [];

    steps.push({
        visitedNodes: new Set(),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Tarjan — encontrando componentes fortemente conexos`,
    });

    type Frame = { nodeId: NodeId; neighborIdx: number };

    for (const startNode of nodes) {
        if (ids.get(startNode.id) !== -1) continue;

        // Initialize root
        sccStack.push(startNode.id);
        ids.set(startNode.id, id);
        lowLink.set(startNode.id, id);
        onStack.set(startNode.id, true);
        id++;

        const dfsStack: Frame[] = [{ nodeId: startNode.id, neighborIdx: 0 }];
        const startLabel = nodeMap.get(startNode.id)?.label ?? startNode.id;
        steps.push({
            visitedNodes: new Set(allSCCNodes),
            activeNode: startNode.id,
            visitedEdges: new Set(visitedEdges),
            activeEdge: undefined,
            message: `Visitando ${startLabel} (id=${ids.get(startNode.id)})`,
        });

        while (dfsStack.length > 0) {
            const frame = dfsStack[dfsStack.length - 1];
            const u = frame.nodeId;
            const neighbors = adj.get(u) ?? [];
            let pushed = false;

            while (frame.neighborIdx < neighbors.length) {
                const { neighborId: w, edgeId } = neighbors[frame.neighborIdx];
                frame.neighborIdx++;

                if (ids.get(w) === -1) {
                    // Tree edge: visit w
                    sccStack.push(w);
                    ids.set(w, id);
                    lowLink.set(w, id);
                    onStack.set(w, true);
                    id++;
                    visitedEdges.add(edgeId);
                    dfsStack.push({ nodeId: w, neighborIdx: 0 });

                    const wLabel = nodeMap.get(w)?.label ?? w;
                    steps.push({
                        visitedNodes: new Set(allSCCNodes),
                        activeNode: w,
                        visitedEdges: new Set(visitedEdges),
                        activeEdge: edgeId,
                        message: `Visitando ${wLabel} (id=${ids.get(w)})`,
                    });

                    pushed = true;
                    break;
                } else if (onStack.get(w)) {
                    // Back/cross edge on stack: update low[u]
                    const newLow = Math.min(lowLink.get(w)!, lowLink.get(u)!);
                    lowLink.set(u, newLow);
                    visitedEdges.add(edgeId);
                }
            }

            if (!pushed) {
                dfsStack.pop();

                // Propagate low to parent
                if (dfsStack.length > 0) {
                    const parent = dfsStack[dfsStack.length - 1].nodeId;
                    lowLink.set(parent, Math.min(lowLink.get(parent)!, lowLink.get(u)!));
                }

                // If u is root of an SCC, pop the SCC stack
                if (lowLink.get(u) === ids.get(u)) {
                    const scc: NodeId[] = [];
                    let w: NodeId;
                    do {
                        w = sccStack.pop()!;
                        onStack.set(w, false);
                        scc.push(w);
                        allSCCNodes.add(w);
                    } while (w !== u);

                    components.push(scc);
                    const sccLabels = scc.map((nid) => nodeMap.get(nid)?.label ?? nid).join(', ');
                    steps.push({
                        visitedNodes: new Set(allSCCNodes),
                        activeNode: u,
                        visitedEdges: new Set(visitedEdges),
                        activeEdge: undefined,
                        message: scc.length === 1
                            ? `${sccLabels} — componente trivial`
                            : `SCC encontrada: {${sccLabels}}`,
                    });
                }
            }
        }
    }

    steps.push({
        visitedNodes: new Set(allSCCNodes),
        activeNode: undefined,
        visitedEdges: new Set(visitedEdges),
        activeEdge: undefined,
        message: `${components.length} componente(s) fortemente conexo(s)`,
    });

    return steps;
}
