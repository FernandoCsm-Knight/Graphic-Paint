import { describe, expect, it } from 'vitest';
import type { Point } from '@/types/geometry';
import generator from '../_types/ShapeGenerator';
import type { BoundingBox, Shape } from './ShapeTypes';
import { moveShapeVertex, getShapeVertices } from '../_utils/vertexUtils';

/** Vertices expressed in the oriented frame's local (unrotated) space. */
function localVertices(shape: Shape & { points: Point[] }) {
    const frame = shape.getOverlayBounds();
    const angle = shape.getVisualRotation();
    const cx = frame.x + frame.width / 2;
    const cy = frame.y + frame.height / 2;
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    return {
        frame,
        points: shape.points.map((p) => ({
            x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
            y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
        })),
    };
}

/** The oriented box must enclose every vertex and touch them on all four sides. */
function expectFrameFitsShape(shape: Shape) {
    const { frame, points } = localVertices(shape as Shape & { points: Point[] });
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(frame.x, 4);
    expect(Math.max(...xs)).toBeCloseTo(frame.x + frame.width, 4);
    expect(Math.min(...ys)).toBeCloseTo(frame.y, 4);
    expect(Math.max(...ys)).toBeCloseTo(frame.y + frame.height, 4);
}

const center = (b: BoundingBox) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** Same calls usePendingPlacement makes for a rotation drag. */
function rotate(shape: Shape, angle: number) {
    const pivot = center(shape.getOverlayBounds());
    shape.beginRotate();
    shape.rotateBy(angle / 2, pivot);
    shape.rotateBy(angle, pivot);
    shape.endRotate();
}

/** Same calls usePendingPlacement makes for dragging the SE handle by (dw, dh) in frame space. */
function resizeSE(shape: Shape, dw: number, dh: number) {
    const frame = shape.getOverlayBounds();
    const angle = shape.getVisualRotation();
    const c = center(frame);
    shape.beginResize(frame, angle, c);
    const next = { x: frame.x, y: frame.y, width: frame.width + dw, height: frame.height + dh };
    shape.resizeToBoundingBox(next, {});
    shape.endResize();
}

const kinds = ['triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star', 'rect'];
const make = (kind: string) =>
    generator({ start: { x: 100, y: 100 }, end: { x: 400, y: 260 }, kind, color: '#000', thickness: 1 });

describe.each(kinds)('caixa orientada acompanha a forma: %s', (kind) => {
    it('recém-criada', () => expectFrameFitsShape(make(kind)));

    it('girada', () => {
        const shape = make(kind);
        rotate(shape, (25 * Math.PI) / 180);
        expectFrameFitsShape(shape);
    });

    it('girada duas vezes', () => {
        const shape = make(kind);
        rotate(shape, 0.4);
        rotate(shape, -0.9);
        expectFrameFitsShape(shape);
    });

    it('girada e depois redimensionada', () => {
        const shape = make(kind);
        rotate(shape, 0.5);
        resizeSE(shape, 60, -30);
        expectFrameFitsShape(shape);
    });

    it('girada e movida', () => {
        const shape = make(kind);
        rotate(shape, 0.5);
        shape.moveBy(37, -12);
        expectFrameFitsShape(shape);
    });

    it('vértice arrastado (modo vértices)', () => {
        const shape = make(kind);
        const [first] = getShapeVertices(shape);
        moveShapeVertex(shape, first.id, 0, -80);
        expectFrameFitsShape(shape);
    });

    it('redimensionada e com vértice arrastado (sem rotação)', () => {
        const shape = make(kind);
        resizeSE(shape, 40, 20);
        const [first] = getShapeVertices(shape);
        moveShapeVertex(shape, first.id, 0, -80);
        expectFrameFitsShape(shape);
    });

    it('girada e com vértice arrastado', () => {
        const shape = make(kind);
        rotate(shape, 0.5);
        const [first] = getShapeVertices(shape);
        moveShapeVertex(shape, first.id, 0, -80);
        expectFrameFitsShape(shape);
    });
});

