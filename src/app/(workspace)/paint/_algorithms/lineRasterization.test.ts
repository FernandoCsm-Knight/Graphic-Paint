import { describe, expect, it } from 'vitest';
import type { Point } from '@/types/geometry';
import bresenham from './BresenhamLine';
import dda from './DDA';

const ctx = {} as CanvasRenderingContext2D;

type LineAlgorithm = typeof bresenham;

function rasterize(algorithm: LineAlgorithm, start: Point, end: Point): Point[] {
    const points: Point[] = [];
    algorithm(start, end, (p) => points.push({ x: p.x, y: p.y }), ctx);
    return points;
}

describe.each([
    ['bresenham', bresenham],
    ['dda', dda],
] as const)('%s', (_name, algorithm) => {
    it('rasteriza reta horizontal', () => {
        expect(rasterize(algorithm, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([
            { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        ]);
    });

    it('rasteriza reta vertical para cima', () => {
        expect(rasterize(algorithm, { x: 2, y: 3 }, { x: 2, y: 0 })).toEqual([
            { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
        ]);
    });

    it('rasteriza diagonal de 45 graus', () => {
        expect(rasterize(algorithm, { x: 0, y: 0 }, { x: 3, y: 3 })).toEqual([
            { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 },
        ]);
    });

    it('gera pixels contíguos do início ao fim em reta inclinada', () => {
        const start = { x: 0, y: 0 };
        const end = { x: -7, y: 3 };
        const points = rasterize(algorithm, start, end);

        expect(points[0]).toEqual(start);
        expect(points[points.length - 1]).toEqual(end);
        expect(points).toHaveLength(8);
        for (let i = 1; i < points.length; i++) {
            expect(Math.abs(points[i].x - points[i - 1].x)).toBeLessThanOrEqual(1);
            expect(Math.abs(points[i].y - points[i - 1].y)).toBeLessThanOrEqual(1);
        }
    });
});
