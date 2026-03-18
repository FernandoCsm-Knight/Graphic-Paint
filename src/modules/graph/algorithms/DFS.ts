import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../types/graph';

export function runDFS(
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

    const startLabel = nodeMap.get(startNodeId)?.label ?? startNodeId;
    steps.push({
        visitedNodes: new Set(visited),
        activeNode: startNodeId,
        visitedEdges: new Set(visitedEdges),
        activeEdge: undefined,
        message: `DFS iniciada em ${startLabel}`,
    });

    // Iterative DFS — stack stores (nodeId, edgeId that led here)
    const stack: { nodeId: NodeId; edgeId: EdgeId | undefined }[] = [
        { nodeId: startNodeId, edgeId: undefined },
    ];

    while (stack.length > 0) {
        const { nodeId: current, edgeId: fromEdge } = stack.pop()!;

        if (fromEdge !== undefined && !visited.has(current)) {
            visited.add(current);
            visitedEdges.add(fromEdge);
            const label = nodeMap.get(current)?.label ?? current;
            steps.push({
                visitedNodes: new Set(visited),
                activeNode: current,
                visitedEdges: new Set(visitedEdges),
                activeEdge: fromEdge,
                message: `Visitando ${label}`,
            });
        }

        // Push neighbors in reverse so we process them in order
        const neighbors = [...(adj.get(current) ?? [])].reverse();
        for (const { neighborId, edgeId } of neighbors) {
            if (!visited.has(neighborId)) {
                stack.push({ nodeId: neighborId, edgeId });
            }
        }
    }

    steps.push({
        visitedNodes: new Set(visited),
        activeNode: undefined,
        visitedEdges: new Set(visitedEdges),
        activeEdge: undefined,
        message: `DFS concluída — ${visited.size} ${visited.size === 1 ? 'vértice visitado' : 'vértices visitados'}`,
    });

    return steps;
}
