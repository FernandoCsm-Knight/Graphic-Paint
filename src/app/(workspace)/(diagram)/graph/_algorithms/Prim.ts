import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

export function runPrim(
    nodes: GraphNode[],
    edges: GraphEdge[],
    startNodeId: NodeId,
): AlgorithmStep[] {
    if (nodes.length === 0) return [];

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    // Build undirected adjacency list
    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId; weight: number }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id, weight: e.weight });
        adj.get(e.target)!.push({ neighborId: e.source, edgeId: e.id, weight: e.weight });
    }

    const inMST = new Set<NodeId>([startNodeId]);
    const mstEdges = new Set<EdgeId>();
    const startLabel = nodeMap.get(startNodeId)?.label ?? startNodeId;

    steps.push({
        visitedNodes: new Set(inMST),
        activeNode: startNodeId,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Prim iniciado em ${startLabel}`,
    });

    let totalCost = 0;

    while (inMST.size < nodes.length) {
        let minWeight = Infinity;
        let minEdgeId: EdgeId | undefined;
        let minNeighbor: NodeId | undefined;

        for (const u of inMST) {
            for (const { neighborId, edgeId, weight } of adj.get(u) ?? []) {
                if (!inMST.has(neighborId) && weight < minWeight) {
                    minWeight = weight;
                    minEdgeId = edgeId;
                    minNeighbor = neighborId;
                }
            }
        }

        if (minNeighbor === undefined) break; // grafo desconexo

        inMST.add(minNeighbor);
        mstEdges.add(minEdgeId!);
        totalCost += minWeight;

        const vLabel = nodeMap.get(minNeighbor)?.label ?? minNeighbor;
        steps.push({
            visitedNodes: new Set(inMST),
            activeNode: minNeighbor,
            visitedEdges: new Set(mstEdges),
            activeEdge: minEdgeId,
            message: `Adicionando ${vLabel} à MST (peso ${minWeight})`,
        });
    }

    steps.push({
        visitedNodes: new Set(inMST),
        activeNode: undefined,
        visitedEdges: new Set(mstEdges),
        activeEdge: undefined,
        message: `MST concluída — custo total: ${totalCost}`,
    });

    return steps;
}
