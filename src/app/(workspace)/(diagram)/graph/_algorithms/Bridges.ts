import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

export function runBridges(
    nodes: GraphNode[],
    edges: GraphEdge[],
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // Build undirected adjacency list
    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id });
        adj.get(e.target)!.push({ neighborId: e.source, edgeId: e.id });
    }

    const disc = new Map<NodeId, number>();
    const low = new Map<NodeId, number>();
    const visited = new Set<NodeId>();
    const bridges = new Set<EdgeId>();
    const exploredEdges = new Set<EdgeId>();
    let timer = 0;

    steps.push({
        visitedNodes: new Set(),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Busca de pontes — DFS com valores low-link`,
    });

    // Iterative DFS — each frame: { node, parentEdgeId, neighborIdx }
    type Frame = { nodeId: NodeId; parentEdge: EdgeId | undefined; neighborIdx: number };

    const dfs = (start: NodeId) => {
        visited.add(start);
        disc.set(start, timer);
        low.set(start, timer);
        timer++;

        const stack: Frame[] = [{ nodeId: start, parentEdge: undefined, neighborIdx: 0 }];

        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            const { nodeId: u, parentEdge } = frame;
            const neighbors = adj.get(u) ?? [];
            let pushed = false;

            while (frame.neighborIdx < neighbors.length) {
                const { neighborId: v, edgeId } = neighbors[frame.neighborIdx];
                frame.neighborIdx++;

                // Skip the edge we came from (by edge id to handle multi-edges correctly)
                if (edgeId === parentEdge) continue;

                if (!visited.has(v)) {
                    visited.add(v);
                    disc.set(v, timer);
                    low.set(v, timer);
                    timer++;
                    exploredEdges.add(edgeId);

                    const vLabel = nodeMap.get(v)?.label ?? v;
                    steps.push({
                        visitedNodes: new Set(visited),
                        activeNode: v,
                        visitedEdges: new Set(exploredEdges),
                        activeEdge: edgeId,
                        message: `Visitando ${vLabel} (disc=${disc.get(v)}, low=${low.get(v)})`,
                    });

                    stack.push({ nodeId: v, parentEdge: edgeId, neighborIdx: 0 });
                    pushed = true;
                    break;
                } else {
                    // Back edge — update low[u]
                    if ((disc.get(v) ?? 0) < (low.get(u) ?? 0)) {
                        low.set(u, disc.get(v)!);
                    }
                }
            }

            if (!pushed) {
                stack.pop();
                if (stack.length > 0) {
                    const parent = stack[stack.length - 1].nodeId;
                    // Propagate low upward
                    const newLow = Math.min(low.get(parent)!, low.get(u)!);
                    low.set(parent, newLow);

                    const uLabel = nodeMap.get(u)?.label ?? u;
                    const pLabel = nodeMap.get(parent)?.label ?? parent;

                    // Bridge condition: low[u] > disc[parent]
                    if ((low.get(u) ?? 0) > (disc.get(parent) ?? 0)) {
                        bridges.add(parentEdge!);
                        steps.push({
                            visitedNodes: new Set(visited),
                            activeNode: u,
                            visitedEdges: new Set(bridges),
                            activeEdge: parentEdge,
                            message: `Ponte encontrada: ${pLabel} — ${uLabel}`,
                        });
                    } else {
                        steps.push({
                            visitedNodes: new Set(visited),
                            activeNode: u,
                            visitedEdges: new Set(exploredEdges),
                            activeEdge: undefined,
                            message: `Retorno de ${uLabel}: low=${low.get(u)}, low[${pLabel}]←${newLow}`,
                        });
                    }
                }
            }
        }
    };

    for (const n of nodes) {
        if (!visited.has(n.id)) dfs(n.id);
    }

    if (bridges.size === 0) {
        steps.push({
            visitedNodes: new Set(visited),
            activeNode: undefined,
            visitedEdges: new Set(exploredEdges),
            activeEdge: undefined,
            message: `Nenhuma ponte encontrada`,
        });
    } else {
        steps.push({
            visitedNodes: new Set(visited),
            activeNode: undefined,
            visitedEdges: new Set(bridges),
            activeEdge: undefined,
            message: `${bridges.size} ponte(s) encontrada(s)`,
        });
    }

    return steps;
}
