import type { Shape } from "../_shapes/ShapeTypes";
import type { Point } from "@/types/geometry";

export type ShapeVertex = { id: string; point: Point };

type WithStartEnd = Shape & { start: Point; end: Point };
type WithTopLeftBottomRight = Shape & { topLeft: Point; bottomRight: Point };
type WithPoints = Shape & { points: Point[] };

const hasStartEnd = (s: Shape): s is WithStartEnd =>
    'start' in s && 'end' in s;

const hasTopLeftBottomRight = (s: Shape): s is WithTopLeftBottomRight =>
    'topLeft' in s && 'bottomRight' in s;

const hasPoints = (s: Shape): s is WithPoints =>
    'points' in s && Array.isArray((s as WithPoints).points);

/**
 * Returns the geometric vertices of a shape for vertex-mode pending placement.
 * Uses duck-typing so no shape file needs to be modified.
 *
 * - Line / Arrow  → start, end
 * - Rectangle     → nw, ne, se, sw  (all 4 corners, some derived)
 * - Square        → topLeft, bottomRight  (only the 2 stored defining points)
 * - Polygon kinds → every point in the points[] array
 * - Ellipse/Circle → [] (falls back to bbox mode)
 */
export function getShapeVertices(shape: Shape): ShapeVertex[] {
    if (hasStartEnd(shape)) {
        return [
            { id: 'start', point: shape.start },
            { id: 'end',   point: shape.end   },
        ];
    }

    if (hasTopLeftBottomRight(shape)) {
        if (shape.kind === 'square') {
            return [
                { id: 'topLeft',     point: shape.topLeft     },
                { id: 'bottomRight', point: shape.bottomRight },
            ];
        }
        // Rectangle: expose all 4 corners (NE and SW are derived but editable)
        const { topLeft: tl, bottomRight: br } = shape;
        return [
            { id: 'nw', point: { x: tl.x, y: tl.y } },
            { id: 'ne', point: { x: br.x, y: tl.y } },
            { id: 'se', point: { x: br.x, y: br.y } },
            { id: 'sw', point: { x: tl.x, y: br.y } },
        ];
    }

    if (hasPoints(shape)) {
        return shape.points.map((p, i) => ({ id: String(i), point: p }));
    }

    return [];
}

/**
 * Moves a single vertex of the shape by (dx, dy).
 * dx/dy are in the same coordinate space as the shape's vertices
 * (grid units for pixelated shapes, doc pixels otherwise).
 */
function moveVertexOnly(shape: Shape, id: string, dx: number, dy: number): void {
    if (hasStartEnd(shape)) {
        if (id === 'start') { shape.start.x += dx; shape.start.y += dy; }
        else if (id === 'end') { shape.end.x += dx; shape.end.y += dy; }
        return;
    }

    if (hasTopLeftBottomRight(shape)) {
        const { topLeft: tl, bottomRight: br } = shape;
        if (shape.kind === 'square') {
            if (id === 'topLeft')     { tl.x += dx; tl.y += dy; }
            else if (id === 'bottomRight') { br.x += dx; br.y += dy; }
        } else {
            // Rectangle: each corner controls the relevant stored axes
            if      (id === 'nw') { tl.x += dx; tl.y += dy; }
            else if (id === 'ne') { br.x += dx; tl.y += dy; }
            else if (id === 'se') { br.x += dx; br.y += dy; }
            else if (id === 'sw') { tl.x += dx; br.y += dy; }
        }
        return;
    }

    if (hasPoints(shape)) {
        const i = parseInt(id);
        if (!isNaN(i) && i >= 0 && i < shape.points.length) {
            shape.points[i].x += dx;
            shape.points[i].y += dy;
        }
    }
}

/**
 * Moves a single vertex of the shape by (dx, dy), then refits the oriented
 * transform box so the overlay keeps hugging the edited shape.
 * dx/dy are in the same coordinate space as the shape's vertices
 * (grid units for pixelated shapes, doc pixels otherwise).
 */
export function moveShapeVertex(shape: Shape, id: string, dx: number, dy: number): void {
    moveVertexOnly(shape, id, dx, dy);
    refitTransformFrame(shape);
}

/**
 * Recomputes the oriented transform box from the current vertices, keeping
 * the shape's visual rotation: the tightest box, in the rotated frame, that
 * contains every vertex. Without this, editing a vertex of a rotated or
 * resized shape left the overlay box at its old position/size.
 */
export function refitTransformFrame(shape: Shape): void {
    const points = getShapeVertices(shape).map((v) => v.point);
    if (points.length === 0) return;

    const rotation = shape.getVisualRotation();
    const previous = shape.getOverlayBounds();
    const pivot = { x: previous.x + previous.width / 2, y: previous.y + previous.height / 2 };
    const cos = Math.cos(-rotation), sin = Math.sin(-rotation);
    const local = points.map((p) => ({
        x: pivot.x + (p.x - pivot.x) * cos - (p.y - pivot.y) * sin,
        y: pivot.y + (p.x - pivot.x) * sin + (p.y - pivot.y) * cos,
    }));

    const minX = Math.min(...local.map((p) => p.x));
    const maxX = Math.max(...local.map((p) => p.x));
    const minY = Math.min(...local.map((p) => p.y));
    const maxY = Math.max(...local.map((p) => p.y));
    const localCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    // Back to world space: the frame stores its world centre with unrotated size.
    const c = Math.cos(rotation), s = Math.sin(rotation);
    const worldCenter = {
        x: pivot.x + (localCenter.x - pivot.x) * c - (localCenter.y - pivot.y) * s,
        y: pivot.y + (localCenter.x - pivot.x) * s + (localCenter.y - pivot.y) * c,
    };
    const width = maxX - minX;
    const height = maxY - minY;
    shape.restoreTransformFrame(
        { x: worldCenter.x - width / 2, y: worldCenter.y - height / 2, width, height },
        rotation,
    );
}
