import { describe, expect, it } from 'vitest';
import type { Shape, BoundingBox } from './ShapeTypes';
import Circle from './Circle';
import Ellipse from './Ellipse';
import Rectangle from './Rectangle';
import Line from './Line';
import Hexagon from './Hexagon';
import { getShapeVisualBounds } from '../_utils/visualBounds';

const SIZE = 10;

/** Rasterizes a pixel-mode shape and returns the box covering all painted cells. */
function paintedBounds(shape: Shape): BoundingBox {
    const rects: number[][] = [];
    const ctx = {
        fillStyle: '',
        strokeStyle: '',
        fillRect: (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]),
    } as unknown as CanvasRenderingContext2D;
    shape.pixelatedDraw(ctx);
    expect(rects.length).toBeGreaterThan(0);
    const minX = Math.min(...rects.map((r) => r[0]));
    const minY = Math.min(...rects.map((r) => r[1]));
    const maxX = Math.max(...rects.map((r) => r[0] + r[2]));
    const maxY = Math.max(...rects.map((r) => r[1] + r[3]));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const pixel = (lineWidth: number) => ({ pixelated: true, pixelSize: SIZE, lineWidth });

describe('modo pixelado: células pintadas = caixa visual', () => {
    it('círculo com arraste de comprimento ímpar (centro fracionário antes da correção)', () => {
        const circle = new Circle({ x: 3, y: 4 }, { x: 10, y: 4 }, pixel(1)); // ponto médio 6.5
        expect(Number.isInteger(circle.center.x)).toBe(true);
        expect(Number.isInteger(circle.radius)).toBe(true);
        expect(getShapeVisualBounds(circle)).toEqual(paintedBounds(circle));
    });

    it('círculo continua alinhado depois de mover', () => {
        const circle = new Circle({ x: 2, y: 2 }, { x: 9, y: 5 }, pixel(1));
        circle.moveBy(3, -1);
        expect(getShapeVisualBounds(circle)).toEqual(paintedBounds(circle));
    });

    it('elipse com arraste ímpar', () => {
        const ellipse = new Ellipse({ x: 1, y: 1 }, { x: 12, y: 8 }, pixel(1));
        expect(getShapeVisualBounds(ellipse)).toEqual(paintedBounds(ellipse));
    });

    it.each([1, 2, 3, 4])('espessura %i: caixa visual bate com as células (inclusive espessura par)', (lineWidth) => {
        for (const shape of [
            new Circle({ x: 5, y: 5 }, { x: 15, y: 5 }, pixel(lineWidth)),
            new Rectangle({ x: 2, y: 3 }, { x: 9, y: 7 }, pixel(lineWidth)),
            new Line({ x: 1, y: 1 }, { x: 8, y: 6 }, pixel(lineWidth)),
            new Hexagon({ x: 10, y: 10 }, { x: 15, y: 10 }, pixel(lineWidth)),
        ]) {
            expect(getShapeVisualBounds(shape)).toEqual(paintedBounds(shape));
        }
    });
});

describe('modo suave mantém precisão', () => {
    it('elipse não arredonda no modo suave', () => {
        const ellipse = new Ellipse({ x: 0, y: 0 }, { x: 11, y: 7 }, { lineWidth: 1 });
        expect(ellipse.center).toEqual({ x: 5.5, y: 3.5 });
        expect(ellipse.radiusX).toBe(5.5);
    });
});
