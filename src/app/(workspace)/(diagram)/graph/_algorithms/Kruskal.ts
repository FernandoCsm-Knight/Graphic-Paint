import type { GraphNode, GraphEdge, AlgorithmStep, NodeId, EdgeId } from '../_types/graph';

class UnionFind {
    private parent = new Map<NodeId, NodeId>();
    private rank = new Map<NodeId, number>();

    constructor(nodes: NodeId[]) {
        for (const n of nodes) {
            this.parent.set(n, n);
            this.rank.set(n, 0);
        }
    }

    find(x: NodeId): NodeId {
        if (this.parent.get(x) !== x) {
            this.parent.set(x, this.find(this.parent.get(x)!));
        }
        return this.parent.get(x)!;
    }

    union(x: NodeId, y: NodeId): boolean {
        const rx = this.find(x);
        const ry = this.find(y);
        if (rx === ry) return false;
        const rankX = this.rank.get(rx) ?? 0;
        const rankY = this.rank.get(ry) ?? 0;
        if (rankX < rankY) {
            this.parent.set(rx, ry);
        } else if (rankX > rankY) {
            this.parent.set(ry, rx);
        } else {
            this.parent.set(ry, rx);
            this.rank.set(rx, rankX + 1);
        }
        return true;
    }
}

export function runKruskal(
    nodes: GraphNode[],
    edges: GraphEdge[],
): AlgorithmStep[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const steps: AlgorithmStep[] = [];

    const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
    const uf = new UnionFind(nodes.map((n) => n.id));
    const mstEdges = new Set<EdgeId>();
    const visitedNodes = new Set<NodeId>();

    steps.push({
        visitedNodes: new Set(),
        activeNode: undefined,
        visitedEdges: new Set(),
        activeEdge: undefined,
        message: `Kruskal: ${edges.length} arestas ordenadas por peso`,
    });

    let totalCost = 0;

    for (const edge of sortedEdges) {
        const uLabel = nodeMap.get(edge.source)?.label ?? edge.source;
        const vLabel = nodeMap.get(edge.target)?.label ?? edge.target;

        if (uf.union(edge.source, edge.target)) {
            mstEdges.add(edge.id);
            visitedNodes.add(edge.source);
            visitedNodes.add(edge.target);
            totalCost += edge.weight;
            steps.push({
                visitedNodes: new Set(visitedNodes),
                activeNode: edge.target,
                visitedEdges: new Set(mstEdges),
                activeEdge: edge.id,
                message: `Adicionando ${uLabel} — ${vLabel} (peso ${edge.weight})`,
            });
        } else {
            steps.push({
                visitedNodes: new Set(visitedNodes),
                activeNode: undefined,
                visitedEdges: new Set(mstEdges),
                activeEdge: edge.id,
                message: `Rejeitando ${uLabel} — ${vLabel} (formaria ciclo)`,
            });
        }

        if (mstEdges.size === nodes.length - 1) break;
    }

    steps.push({
        visitedNodes: new Set(visitedNodes),
        activeNode: undefined,
        visitedEdges: new Set(mstEdges),
        activeEdge: undefined,
        message: `MST concluída — custo total: ${totalCost}`,
    });

    return steps;
}
