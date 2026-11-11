import type { Point } from '@/types/geometry';
import { Shape, type BoundingBox, type SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import Arrow from '@/app/(workspace)/paint/_shapes/Arrow';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import Ellipse from '@/app/(workspace)/paint/_shapes/Ellipse';
import BezierCurve, { sampleBezier } from '@/app/(workspace)/paint/_shapes/BezierCurve';
import BSplineCurve, { sampleBSpline } from '@/app/(workspace)/paint/_shapes/BSplineCurve';
import ImageShape from '@/app/(workspace)/paint/_shapes/ImageShape';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';

/** A polyline in document pixels; `closed` joins the last point to the first. */
export type Outline = { points: Point[]; closed: boolean };

const CURVE_SAMPLES = 64;

/** Shapes whose geometry is a closed polygon stored in `points`. */
type PolygonLike = Shape & { points: Point[] };

function hasPoints(shape: Shape): shape is PolygonLike {
    return Array.isArray((shape as Partial<PolygonLike>).points);
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function sampleEllipse(center: Point, rx: number, ry: number, angle: number): Point[] {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return Array.from({ length: CURVE_SAMPLES }, (_, i) => {
        const t = (i / CURVE_SAMPLES) * Math.PI * 2;
        const x = rx * Math.cos(t);
        const y = ry * Math.sin(t);
        return { x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos };
    });
}

/** Outlines in the shape's own coordinates (grid units when pixelated). */
function localOutlines(shape: Shape): Outline[] {
    if (shape instanceof ShapeGroup) return shape.shapes.flatMap(localOutlines);
    if (shape instanceof ImageShape) return [{ points: shape.getRotatedCorners(), closed: true }];
    if (shape instanceof Arrow) {
        const [h1, h2] = shape.getHeadPoints();
        return [
            { points: [shape.start, shape.end], closed: false },
            { points: [h1, shape.end, h2], closed: false },
        ];
    }
    if (shape instanceof Line) return [{ points: [shape.start, shape.end], closed: false }];
    if (shape instanceof Circle) return [{ points: sampleEllipse(shape.center, shape.radius, shape.radius, 0), closed: true }];
    if (shape instanceof Ellipse) {
        return [{ points: sampleEllipse(shape.center, shape.radiusX, shape.radiusY, shape.ellipseAngle), closed: true }];
    }
    if (shape instanceof BezierCurve) return [{ points: sampleBezier(shape.points, CURVE_SAMPLES), closed: false }];
    if (shape instanceof BSplineCurve) {
        const pts = shape.points.length >= 4 ? sampleBSpline(shape.points, CURVE_SAMPLES) : shape.points;
        return [{ points: pts, closed: false }];
    }
    if (hasPoints(shape)) return [{ points: shape.points, closed: true }];
    const bb = shape.getBoundingBox();
    return [{ points: rectCorners(bb), closed: true }];
}

function rectCorners(bb: BoundingBox): Point[] {
    return [
        { x: bb.x, y: bb.y },
        { x: bb.x + bb.width, y: bb.y },
        { x: bb.x + bb.width, y: bb.y + bb.height },
        { x: bb.x, y: bb.y + bb.height },
    ];
}

/**
 * Outlines in document pixels. Pixelated shapes store grid cells: each
 * cell coordinate maps to the centre of that cell.
 */
export function getShapeOutlines(shape: Shape): Outline[] {
    const outlines = localOutlines(shape);
    if (!shape.pixelated) return outlines;
    const size = shape.pixelSize;
    const toDoc = (p: Point) => ({ x: p.x * size + size / 2, y: p.y * size + size / 2 });
    return outlines.map((o) => ({ points: o.points.map(toDoc), closed: o.closed }));
}

/** Half the drawn stroke thickness in document pixels. */
function strokeHalfWidth(shape: Shape): number {
    if (shape instanceof ShapeGroup) {
        return Math.max(0, ...shape.shapes.map(strokeHalfWidth));
    }
    return shape.pixelated ? (shape.lineWidth * shape.pixelSize) / 2 : shape.lineWidth / 2;
}

function forEachSegment(outline: Outline, visit: (a: Point, b: Point) => boolean): boolean {
    const { points, closed } = outline;
    if (points.length === 1) return visit(points[0], points[0]);
    const count = closed ? points.length : points.length - 1;
    for (let i = 0; i < count; i++) {
        if (visit(points[i], points[(i + 1) % points.length])) return true;
    }
    return false;
}

export function pointInPolygon(p: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }
    return inside;
}

/** True when the shape's interior counts as a hit (images, filled shapes). */
function hasSolidInterior(shape: Shape): boolean {
    return shape instanceof ImageShape || shape.filled;
}

/**
 * Hit test against what is drawn: the stroke (with `tolerance` document
 * pixels of slack beyond half the stroke width) or, for images and filled
 * shapes, the interior.
 */
export function hitTestShape(shape: Shape, point: Point, tolerance: number): boolean {
    if (shape instanceof ShapeGroup) return shape.shapes.some((child) => hitTestShape(child, point, tolerance));

    const reach = strokeHalfWidth(shape) + tolerance;
    const outlines = getShapeOutlines(shape);
    const onStroke = outlines.some((outline) =>
        forEachSegment(outline, (a, b) => distanceToSegment(point, a, b) <= reach),
    );
    if (onStroke) return true;

    return hasSolidInterior(shape) && outlines.some((o) => o.closed && pointInPolygon(point, o.points));
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
    const cross = (o: Point, p: Point, q: Point) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function pointInRect(p: Point, r: BoundingBox): boolean {
    return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** True when the drawn outline touches the rectangle (not just the bounding box). */
export function shapeIntersectsRect(shape: Shape, rect: BoundingBox): boolean {
    if (shape instanceof ShapeGroup) return shape.shapes.some((child) => shapeIntersectsRect(child, rect));

    const corners = rectCorners(rect);
    const edges: [Point, Point][] = corners.map((c, i) => [c, corners[(i + 1) % 4]]);
    const outlines = getShapeOutlines(shape);

    const touches = outlines.some((outline) =>
        outline.points.some((p) => pointInRect(p, rect)) ||
        forEachSegment(outline, (a, b) => edges.some(([c, d]) => segmentsIntersect(a, b, c, d))),
    );
    if (touches) return true;

    // Rectangle entirely inside a filled shape / image.
    return hasSolidInterior(shape) && outlines.some((o) => o.closed && pointInPolygon(corners[0], o.points));
}

/** Topmost shape (last drawn) hit by `point`, among `candidates`. */
export function findTopmostHit(
    candidates: readonly SceneItem[],
    point: Point,
    tolerance: number,
    accept: (shape: Shape) => boolean = () => true,
): Shape | null {
    for (let i = candidates.length - 1; i >= 0; i--) {
        const item = candidates[i];
        if (item instanceof Shape && accept(item) && hitTestShape(item, point, tolerance)) return item;
    }
    return null;
}
