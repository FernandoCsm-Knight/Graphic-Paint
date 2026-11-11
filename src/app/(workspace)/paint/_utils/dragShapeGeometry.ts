import type { Point } from '@/types/geometry';
import type { BoundingBox } from '@/app/(workspace)/paint/_shapes/ShapeTypes';

/** Keyboard modifiers held while dragging out a shape. */
export type DragModifiers = {
    /** Keep proportions (square box) / snap lines to 45°. */
    shift?: boolean;
    /** Draw from the centre (the press point is the centre). */
    alt?: boolean;
};

/**
 * Box a shape is inscribed in, from the press point to the pointer.
 * - corner to corner by default;
 * - `proportional`: square box whose side is the larger drag distance,
 *   extending in the drag direction;
 * - `fromCenter`: the press point is the centre of the box.
 */
export function computeDragBox(
    start: Point,
    end: Point,
    { proportional = false, fromCenter = false }: { proportional?: boolean; fromCenter?: boolean } = {},
): BoundingBox {
    let dx = end.x - start.x;
    let dy = end.y - start.y;

    if (proportional) {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        dx = (dx < 0 ? -1 : 1) * side;
        dy = (dy < 0 ? -1 : 1) * side;
    }

    if (fromCenter) {
        const hw = Math.abs(dx);
        const hh = Math.abs(dy);
        return { x: start.x - hw, y: start.y - hh, width: hw * 2, height: hh * 2 };
    }

    return {
        x: Math.min(start.x, start.x + dx),
        y: Math.min(start.y, start.y + dy),
        width: Math.abs(dx),
        height: Math.abs(dy),
    };
}

/**
 * Vertices of a regular polygon on the unit circle. Odd polygons and the
 * diamond point up; other even polygons have a flat top edge.
 */
export function regularPolygonUnit(sides: number, pointUp = sides % 2 === 1): Point[] {
    const offset = pointUp ? 0 : Math.PI / sides;
    return Array.from({ length: sides }, (_, i) => {
        const angle = -Math.PI / 2 + offset + (i * 2 * Math.PI) / sides;
        return { x: Math.cos(angle), y: Math.sin(angle) };
    });
}

/** Five-pointed star (inner radius = half the outer), pointing up. */
export function starUnit(points = 5, innerRatio = 0.5): Point[] {
    return Array.from({ length: points * 2 }, (_, i) => {
        const radius = i % 2 === 0 ? 1 : innerRatio;
        const angle = -Math.PI / 2 + (i * Math.PI) / points;
        return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    });
}

/** Stretches `points` so their bounding box fills `box` exactly. */
export function fitPointsToBox(points: Point[], box: BoundingBox, roundToGrid = false): Point[] {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX;
    const spanY = Math.max(...ys) - minY;

    return points.map((p) => {
        const x = box.x + (spanX === 0 ? 0 : ((p.x - minX) / spanX) * box.width);
        const y = box.y + (spanY === 0 ? 0 : ((p.y - minY) / spanY) * box.height);
        return roundToGrid ? { x: Math.round(x), y: Math.round(y) } : { x, y };
    });
}

/**
 * End points of a line/arrow: Shift snaps the direction to multiples of 45°
 * (keeping the length); Alt mirrors it so the press point is the middle.
 */
export function computeDragLine(
    start: Point,
    end: Point,
    { shift = false, alt = false }: DragModifiers = {},
    roundToGrid = false,
): { start: Point; end: Point } {
    let dx = end.x - start.x;
    let dy = end.y - start.y;

    if (shift && (dx !== 0 || dy !== 0)) {
        const step = Math.PI / 4;
        const angle = Math.round(Math.atan2(dy, dx) / step) * step;
        const length = Math.hypot(dx, dy);
        dx = Math.cos(angle) * length;
        dy = Math.sin(angle) * length;
    }

    const round = (p: Point) => (roundToGrid ? { x: Math.round(p.x), y: Math.round(p.y) } : p);
    const from = alt ? { x: start.x - dx, y: start.y - dy } : { ...start };
    return { start: round(from), end: round({ x: start.x + dx, y: start.y + dy }) };
}
