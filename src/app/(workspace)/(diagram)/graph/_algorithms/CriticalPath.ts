import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

export function runCriticalPath(
    nodes: GraphNode[],
    edges: GraphEdge[],
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // Build adjacency list and in-degree (directed)
    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId; weight: number }[]>();
    const inDegree = new Map<NodeId, number>();
    for (const n of nodes) {
        adj.set(n.id, []);
        inDegree.set(n.id, 0);
    }
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id, weight: e.weight });
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }

    // dist[v] = earliest time to reach v (longest path from any source)
    // Sources start at 0; dist[v] = max(dist[u] + weight(u,v))
    const dist = new Map<NodeId, number>();
    const prev = new Map<NodeId, { nodeId: NodeId; edgeId: EdgeId }>();
    for (const n of nodes) dist.set(n.id, 0);

    const queue: NodeId[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
    }

    const visited = new Set<NodeId>();
    const processedEdges = new Set<EdgeId>();
    let processed = 0;

    steps.push({
        visitedNodes: new Set(),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Caminho crítico — calculando períodos mínimos`,
    });

    while (queue.length > 0) {
        const u = queue.shift()!;
        visited.add(u);
        processed++;
        const uLabel = nodeMap.get(u)?.label ?? u;
        const uDist = dist.get(u) ?? 0;

        steps.push({
            visitedNodes: new Set(visited),
            activeNode: u,
            visitedEdges: new Set(processedEdges),
            activeEdge: undefined,
            message: `${uLabel}: período ${uDist + 1}`,
        });

        for (const { neighborId, edgeId, weight } of adj.get(u) ?? []) {
            processedEdges.add(edgeId);
            const newDist = uDist + weight;
            if (newDist > (dist.get(neighborId) ?? 0)) {
                dist.set(neighborId, newDist);
                prev.set(neighborId, { nodeId: u, edgeId });
            }
            const newDeg = (inDegree.get(neighborId) ?? 1) - 1;
            inDegree.set(neighborId, newDeg);
            if (newDeg === 0) queue.push(neighborId);
        }
    }

    if (processed !== nodes.length) {
        steps.push({
            visitedNodes: new Set(visited),
            activeNode: undefined,
            visitedEdges: new Set(processedEdges),
            activeEdge: undefined,
            message: `Ciclo detectado! Caminho crítico não se aplica a grafos cíclicos.`,
        });
        return steps;
    }

    // Find node with maximum distance (end of critical path)
    let maxDist = -1;
    let endNode: NodeId | undefined;
    for (const [id, d] of dist) {
        if (d > maxDist) {
            maxDist = d;
            endNode = id;
        }
    }

    // Reconstruct critical path via prev map
    const pathNodes = new Set<NodeId>();
    const pathEdges = new Set<EdgeId>();
    let cur: NodeId | undefined = endNode;
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

    const minPeriods = maxDist + 1;
    steps.push({
        visitedNodes: pathNodes,
        activeNode: endNode,
        visitedEdges: pathEdges,
        activeEdge: undefined,
        message: `Caminho crítico: mínimo de ${minPeriods} período(s)`,
    });

    return steps;
}
