import { Shape, type BoundingBox } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import { getShapeOutlines } from './hitTest';

/**
 * Cells painted around a centre cell by `Shape.drawPixel` for a given line
 * width: `before` cells to the left/top and `after` cells to the right/bottom.
 * (Even widths are asymmetric: one more cell after than before.)
 */
export function pixelStrokeExtent(lineWidth: number): { before: number; after: number } {
    const half = Math.floor(lineWidth / 2);
    const start = lineWidth % 2 === 0 ? -half + 1 : -half;
    return { before: Math.abs(start), after: half };
}

/** How far the drawn stroke reaches beyond the outline, in document pixels. */
export function getStrokeReach(shape: Shape): { before: number; after: number } {
    if (shape instanceof ShapeGroup) {
        return shape.shapes.reduce(
            (acc, child) => {
                const reach = getStrokeReach(child);
                return { before: Math.max(acc.before, reach.before), after: Math.max(acc.after, reach.after) };
            },
            { before: 0, after: 0 },
        );
    }
    if (shape.pixelated) {
        // Outlines use cell centres; each painted cell extends half a cell more.
        const { before, after } = pixelStrokeExtent(shape.lineWidth);
        return { before: (before + 0.5) * shape.pixelSize, after: (after + 0.5) * shape.pixelSize };
    }
    return { before: shape.lineWidth / 2, after: shape.lineWidth / 2 };
}

function unionBounds(boxes: BoundingBox[]): BoundingBox {
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.width));
    const maxY = Math.max(...boxes.map((b) => b.y + b.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Axis-aligned box of what is actually drawn, in document pixels: the
 * outline (including arrow heads and sampled curves) expanded by the stroke
 * thickness. Use it for display/selection; keep `getBoundingBox()` (pure
 * geometry) for resizing.
 */
export function getShapeVisualBounds(shape: Shape): BoundingBox {
    if (shape instanceof ShapeGroup) {
        return shape.shapes.length ? unionBounds(shape.shapes.map(getShapeVisualBounds)) : { x: 0, y: 0, width: 0, height: 0 };
    }
    const points = getShapeOutlines(shape).flatMap((outline) => outline.points);
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const { before, after } = getStrokeReach(shape);
    const x = Math.min(...xs) - before;
    const y = Math.min(...ys) - before;
    return {
        x,
        y,
        width: Math.max(...xs) + after - x,
        height: Math.max(...ys) + after - y,
    };
}

/**
 * Extra space around the geometric overlay box so the dashed box and its
 * handles enclose the stroke and never collapse (e.g. a horizontal line has
 * zero height). `minHalfSize` is in document pixels.
 */
export function getOverlayPadding(
    shape: Shape,
    halfWidth: number,
    halfHeight: number,
    minHalfSize: number,
): { x: number; y: number } {
    const { before, after } = getStrokeReach(shape);
    // Pixel-mode overlay boxes already include the centre cells.
    const stroke = shape.pixelated ? Math.max(before, after) - shape.pixelSize / 2 : Math.max(before, after);
    return {
        x: Math.max(stroke, minHalfSize - halfWidth, 0),
        y: Math.max(stroke, minHalfSize - halfHeight, 0),
    };
}
