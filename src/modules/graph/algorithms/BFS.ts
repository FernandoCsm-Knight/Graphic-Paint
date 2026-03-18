import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../types/graph';

export function runBFS(
    nodes: GraphNode[],
    edges: GraphEdge[],
    startNodeId: NodeId,
    directed: boolean,
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // Build adjacency list
    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id });
        if (!directed) adj.get(e.target)!.push({ neighborId: e.source, edgeId: e.id });
    }

    const visited = new Set<NodeId>([startNodeId]);
    const visitedEdges = new Set<EdgeId>();
    const queue: NodeId[] = [startNodeId];

    const startLabel = nodeMap.get(startNodeId)?.label ?? startNodeId;
    steps.push({
        visitedNodes: new Set(visited),
        activeNode: startNodeId,
        visitedEdges: new Set(visitedEdges),
        activeEdge: undefined,
        message: `BFS iniciada em ${startLabel}`,
    });

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const { neighborId, edgeId } of adj.get(current) ?? []) {
            if (visited.has(neighborId)) continue;
            visited.add(neighborId);
            visitedEdges.add(edgeId);
            queue.push(neighborId);
            const label = nodeMap.get(neighborId)?.label ?? neighborId;
            steps.push({
                visitedNodes: new Set(visited),
                activeNode: neighborId,
                visitedEdges: new Set(visitedEdges),
                activeEdge: edgeId,
                message: `Descobriu ${label}`,
            });
        }
    }

    steps.push({
        visitedNodes: new Set(visited),
        activeNode: undefined,
        visitedEdges: new Set(visitedEdges),
        activeEdge: undefined,
        message: `BFS concluída — ${visited.size} ${visited.size === 1 ? 'vértice visitado' : 'vértices visitados'}`,
    });

    return steps;
}
