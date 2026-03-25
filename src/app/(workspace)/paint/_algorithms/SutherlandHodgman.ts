import type { Point } from "@/types/geometry";
import type { ClipWindow } from "./CohenSutherland";

type Edge = {
    isInside:  (p: Point) => boolean;
    intersect: (a: Point, b: Point) => Point;
};

/**
 * Calcula o ponto de interseção do segmento [a, b] com a borda vertical `x = x`.
 */
function intersectVertical(a: Point, b: Point, x: number): Point {
    const t = (x - a.x) / (b.x - a.x);
    return { x, y: a.y + t * (b.y - a.y) };
}

/**
 * Calcula o ponto de interseção do segmento [a, b] com a borda horizontal `y = y`.
 */
function intersectHorizontal(a: Point, b: Point, y: number): Point {
    const t = (y - a.y) / (b.y - a.y);
    return { x: a.x + t * (b.x - a.x), y };
}

/**
 * Clipa um polígono contra uma única borda semi-infinita usando a regra inside/outside.
 * Para cada aresta do polígono, aplica a lógica de Sutherland-Hodgman:
 * emite o ponto de interseção quando a aresta cruza a borda, e o vértice atual
 * quando ele está dentro.
 */
function clipAgainstEdge(polygon: Point[], edge: Edge): Point[] {
    if (polygon.length === 0) return [];
    const output: Point[] = [];
    for (let i = 0; i < polygon.length; i++) {
        const current  = polygon[i];
        const previous = polygon[(i + polygon.length - 1) % polygon.length];
        if (edge.isInside(current)) {
            if (!edge.isInside(previous)) output.push(edge.intersect(previous, current));
            output.push(current);
        } else if (edge.isInside(previous)) {
            output.push(edge.intersect(previous, current));
        }
    }
    return output;
}

/**
 * Sutherland-Hodgman polygon clipping.
 * Returns the vertices of `polygon` clipped to the rectangular window `win`.
 * Returns an empty array if the polygon is entirely outside.
 */
export const sutherlandHodgman = (polygon: Point[], win: ClipWindow): Point[] => {
    const edges: Edge[] = [
        { isInside: p => p.x >= win.xMin, intersect: (a, b) => intersectVertical(a, b, win.xMin) },
        { isInside: p => p.x <= win.xMax, intersect: (a, b) => intersectVertical(a, b, win.xMax) },
        { isInside: p => p.y >= win.yMin, intersect: (a, b) => intersectHorizontal(a, b, win.yMin) },
        { isInside: p => p.y <= win.yMax, intersect: (a, b) => intersectHorizontal(a, b, win.yMax) },
    ];
    return edges.reduce((poly, edge) => clipAgainstEdge(poly, edge), polygon);
};
