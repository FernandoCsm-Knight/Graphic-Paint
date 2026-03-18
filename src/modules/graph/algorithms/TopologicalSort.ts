import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../types/graph';

export function runTopologicalSort(
    nodes: GraphNode[],
    edges: GraphEdge[],
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    const adj = new Map<NodeId, { neighborId: NodeId; edgeId: EdgeId }[]>();
    const inDegree = new Map<NodeId, number>();
    for (const n of nodes) {
        adj.set(n.id, []);
        inDegree.set(n.id, 0);
    }
    for (const e of edges) {
        adj.get(e.source)!.push({ neighborId: e.target, edgeId: e.id });
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }

    const queue: NodeId[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
    }
    queue.sort();

    const order: string[] = [];
    const visited = new Set<NodeId>();
    const visitedEdges = new Set<EdgeId>();

    steps.push({
        visitedNodes: new Set(),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Ordenação topológica — ${queue.length} vértice(s) com grau 0`,
    });

    while (queue.length > 0) {
        const u = queue.shift()!;
        visited.add(u);
        const uLabel = nodeMap.get(u)?.label ?? u;
        order.push(uLabel);

        steps.push({
            visitedNodes: new Set(visited),
            activeNode: u,
            visitedEdges: new Set(visitedEdges),
            activeEdge: undefined,
            message: `Processando ${uLabel} → [${order.join(', ')}]`,
        });

        for (const { neighborId, edgeId } of adj.get(u) ?? []) {
            const newDeg = (inDegree.get(neighborId) ?? 1) - 1;
            inDegree.set(neighborId, newDeg);
            visitedEdges.add(edgeId);
            if (newDeg === 0) {
                queue.push(neighborId);
                queue.sort();
                const vLabel = nodeMap.get(neighborId)?.label ?? neighborId;
                steps.push({
                    visitedNodes: new Set(visited),
                    activeNode: neighborId,
                    visitedEdges: new Set(visitedEdges),
                    activeEdge: edgeId,
                    message: `${vLabel} liberado (grau 0)`,
                });
            }
        }
    }

    if (visited.size !== nodes.length) {
        steps.push({
            visitedNodes: new Set(visited),
            activeNode: undefined,
            visitedEdges: new Set(visitedEdges),
            activeEdge: undefined,
            message: `Ciclo detectado! Ordenação topológica impossível.`,
        });
    } else {
        steps.push({
            visitedNodes: new Set(visited),
            activeNode: undefined,
            visitedEdges: new Set(visitedEdges),
            activeEdge: undefined,
            message: `Concluído: ${order.join(' → ')}`,
        });
    }

    return steps;
}
