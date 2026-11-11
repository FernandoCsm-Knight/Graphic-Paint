import type { Point } from '@/types/geometry';
import { Shape, type SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import FreeForm from '@/app/(workspace)/paint/_shapes/FreeForm';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import {
    distanceToSegment,
    getShapeOutlines,
    hasSolidInterior,
    pointInPolygon,
    segmentsIntersect,
    shapeIntersectsRect,
    strokeHalfWidth,
} from './hitTest';
import { getSelectableSceneSlice } from './sceneHistory';

/** Shortest distance between segments [a,b] and [c,d]. */
function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
    if (segmentsIntersect(a, b, c, d)) return 0;
    return Math.min(
        distanceToSegment(a, c, d),
        distanceToSegment(b, c, d),
        distanceToSegment(c, a, b),
        distanceToSegment(d, a, b),
    );
}

/** Eraser path in document pixels and how far it reaches from its centre line. */
function eraserGeometry(eraser: FreeForm): { path: Point[]; reach: number } {
    const size = eraser.pixelated ? eraser.pixelSize : 1;
    const path = eraser.pixelated
        ? eraser.points.map((p) => ({ x: p.x * size + size / 2, y: p.y * size + size / 2 }))
        : eraser.points;
    const width = eraser.lineWidth * size;
    // Spray scatters dots up to 2.5× the width around each point.
    const reach = eraser.brushStyle === 'spray' && !eraser.pixelated ? width * 2.5 : width / 2;
    return { path, reach };
}

/** True when an eraser stroke touches any painted part of the shape. */
function eraserTouchesShape(eraser: FreeForm, shape: Shape): boolean {
    if (shape instanceof ShapeGroup) return shape.shapes.some((child) => eraserTouchesShape(eraser, child));

    const { path, reach } = eraserGeometry(eraser);
    if (path.length === 0) return false;
    const limit = reach + strokeHalfWidth(shape);
    const outlines = getShapeOutlines(shape);
    const eraserSegments: [Point, Point][] = path.length === 1
        ? [[path[0], path[0]]]
        : path.slice(1).map((p, i) => [path[i], p]);

    for (const outline of outlines) {
        const pts = outline.points;
        const count = outline.closed ? pts.length : pts.length - 1;
        for (let i = 0; i < Math.max(count, 1); i++) {
            const a = pts[i];
            const b = pts.length === 1 ? pts[0] : pts[(i + 1) % pts.length];
            if (eraserSegments.some(([c, d]) => segmentDistance(a, b, c, d) <= limit)) return true;
        }
    }

    // Erasing inside a filled shape / image also removes part of it.
    return hasSolidInterior(shape) && outlines.some((o) => o.closed && path.some((p) => pointInPolygon(p, o.points)));
}

/**
 * True when `eraser` (an eraser stroke, page-eraser band or cut hole drawn
 * AFTER the shape) removes any of the shape's pixels.
 */
export function isShapeErasedBy(shape: Shape, eraser: SceneItem): boolean {
    if (eraser instanceof ClearRectItem) {
        return shapeIntersectsRect(shape, { x: eraser.x, y: eraser.y, width: eraser.w, height: eraser.h });
    }
    if (eraser instanceof FreeForm && eraser.isEraser) {
        return eraserTouchesShape(eraser, shape);
    }
    return false;
}

/**
 * Shapes the user can still select and edit as vectors.
 * - Shapes under a fill bucket are baked (see `getSelectableSceneSlice`).
 * - Shapes touched by the eraser, the page eraser or a cut are now pixels:
 *   moving them would bring the erased part back, so they are not editable.
 *   They stay in the scene (undoing the erasure must restore them).
 */
export function getEditableShapes(scene: readonly SceneItem[]): Shape[] {
    const slice = getSelectableSceneSlice([...scene]);
    const result: Shape[] = [];
    for (let i = 0; i < slice.length; i++) {
        const item = slice[i];
        if (!(item instanceof Shape)) continue;
        let erased = false;
        for (let j = i + 1; j < slice.length && !erased; j++) {
            erased = isShapeErasedBy(item, slice[j]);
        }
        if (!erased) result.push(item);
    }
    return result;
}
