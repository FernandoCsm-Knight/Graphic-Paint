import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

export function runDijkstra(
    nodes: GraphNode[],
    edges: GraphEdge[],
    startNodeId: NodeId,
    endNodeId: NodeId,
    directed: boolean,
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // Build weighted adjacency list
    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId; weight: number }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id, weight: e.weight });
        if (!directed) adj.get(e.target)!.push({ neighborId: e.source, edgeId: e.id, weight: e.weight });
    }

    const dist = new Map<NodeId, number>();
    const prev = new Map<NodeId, { nodeId: NodeId; edgeId: EdgeId }>();
    for (const n of nodes) dist.set(n.id, Infinity);
    dist.set(startNodeId, 0);

    // Simple priority queue as sorted array
    const pq: { nodeId: NodeId; dist: number }[] = [{ nodeId: startNodeId, dist: 0 }];
    const settled = new Set<NodeId>();
    const visitedNodes = new Set<NodeId>();
    const visitedEdges = new Set<EdgeId>();

    const startLabel = nodeMap.get(startNodeId)?.label ?? startNodeId;
    const endLabel = nodeMap.get(endNodeId)?.label ?? endNodeId;

    steps.push({
        visitedNodes: new Set(),
        activeNode: startNodeId,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Dijkstra de ${startLabel} → ${endLabel}`,
    });

    while (pq.length > 0) {
        pq.sort((a, b) => a.dist - b.dist);
        const { nodeId: u, dist: d } = pq.shift()!;

        if (settled.has(u)) continue;
        settled.add(u);
        visitedNodes.add(u);

        const uLabel = nodeMap.get(u)?.label ?? u;
        const dDisplay = isFinite(d) ? d : '∞';
        steps.push({
            visitedNodes: new Set(visitedNodes),
            activeNode: u,
            visitedEdges: new Set(visitedEdges),
            activeEdge: undefined,
            message: `Processando ${uLabel} (dist = ${dDisplay})`,
        });

        if (u === endNodeId) break;

        for (const { neighborId: v, edgeId, weight } of adj.get(u) ?? []) {
            if (settled.has(v)) continue;
            const newDist = d + weight;
            if (newDist < dist.get(v)!) {
                dist.set(v, newDist);
                prev.set(v, { nodeId: u, edgeId });
                pq.push({ nodeId: v, dist: newDist });
                const vLabel = nodeMap.get(v)?.label ?? v;
                visitedEdges.add(edgeId);
                steps.push({
                    visitedNodes: new Set(visitedNodes),
                    activeNode: v,
                    visitedEdges: new Set(visitedEdges),
                    activeEdge: edgeId,
                    message: `Atualizando ${vLabel}: dist = ${newDist}`,
                });
            }
        }
    }

    // Reconstruct shortest path
    const finalDist = dist.get(endNodeId) ?? Infinity;
    if (!isFinite(finalDist)) {
        steps.push({
            visitedNodes: new Set(visitedNodes),
            activeNode: undefined,
            visitedEdges: new Set(visitedEdges),
            activeEdge: undefined,
            message: `Não há caminho de ${startLabel} para ${endLabel}`,
        });
        return steps;
    }

    // Walk backwards through prev to collect path nodes and edges
    const pathNodes = new Set<NodeId>();
    const pathEdges = new Set<EdgeId>();
    let cur: NodeId | undefined = endNodeId;
    while (cur !== undefined) {
        pathNodes.add(cur);
        const p = prev.get(cur);
        if (p) {
            pathEdges.add(p.edgeId);
            cur = p.nodeId;
        } else {
            cur = undefined;
        }
    }

    steps.push({
        visitedNodes: pathNodes,
        activeNode: endNodeId,
        visitedEdges: pathEdges,
        activeEdge: undefined,
        message: `Caminho mínimo de ${startLabel} → ${endLabel}: distância ${finalDist}`,
    });

    return steps;
}
