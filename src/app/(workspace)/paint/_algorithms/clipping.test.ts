import { describe, expect, it } from 'vitest';
import { cohenSutherland, type ClipWindow } from './CohenSutherland';
import { liangBarsky } from './LiangBarsky';
import { sutherlandHodgman } from './SutherlandHodgman';

const win: ClipWindow = { xMin: 0, yMin: 0, xMax: 10, yMax: 10 };

describe.each([
    ['cohenSutherland', cohenSutherland],
    ['liangBarsky', liangBarsky],
] as const)('%s', (_name, clip) => {
    it('mantém segmento totalmente dentro', () => {
        expect(clip({ x: 1, y: 1 }, { x: 9, y: 5 }, win)).toEqual({
            p1: { x: 1, y: 1 },
            p2: { x: 9, y: 5 },
        });
    });

    it('descarta segmento totalmente fora', () => {
        expect(clip({ x: -5, y: -5 }, { x: -1, y: 20 }, win)).toBeNull();
        expect(clip({ x: 11, y: 2 }, { x: 15, y: 8 }, win)).toBeNull();
    });

    it('recorta segmento horizontal que cruza a janela', () => {
        expect(clip({ x: -5, y: 5 }, { x: 15, y: 5 }, win)).toEqual({
            p1: { x: 0, y: 5 },
            p2: { x: 10, y: 5 },
        });
    });

    it('recorta diagonal que cruza dois cantos', () => {
        const result = clip({ x: -5, y: -5 }, { x: 15, y: 15 }, win);
        expect(result).not.toBeNull();
        expect(result!.p1.x).toBeCloseTo(0);
        expect(result!.p1.y).toBeCloseTo(0);
        expect(result!.p2.x).toBeCloseTo(10);
        expect(result!.p2.y).toBeCloseTo(10);
    });

    it('recorta segmento com uma ponta dentro', () => {
        const result = clip({ x: 5, y: 5 }, { x: 5, y: 20 }, win);
        expect(result).toEqual({ p1: { x: 5, y: 5 }, p2: { x: 5, y: 10 } });
    });
});

describe('sutherlandHodgman', () => {
    it('mantém polígono totalmente dentro', () => {
        const square = [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 4 }];
        expect(sutherlandHodgman(square, win)).toEqual(square);
    });

    it('retorna vazio para polígono totalmente fora', () => {
        const square = [{ x: 20, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 30 }, { x: 20, y: 30 }];
        expect(sutherlandHodgman(square, win)).toEqual([]);
    });

    it('recorta polígono maior que a janela para a própria janela', () => {
        const big = [{ x: -5, y: -5 }, { x: 15, y: -5 }, { x: 15, y: 15 }, { x: -5, y: 15 }];
        const result = sutherlandHodgman(big, win);
        const xs = result.map((p) => p.x);
        const ys = result.map((p) => p.y);
        expect(Math.min(...xs)).toBe(0);
        expect(Math.max(...xs)).toBe(10);
        expect(Math.min(...ys)).toBe(0);
        expect(Math.max(...ys)).toBe(10);
        expect(result).toHaveLength(4);
    });

    it('recorta triângulo que cruza uma borda', () => {
        const triangle = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 5, y: 8 }];
        const result = sutherlandHodgman(triangle, win);
        expect(result.every((p) => p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10)).toBe(true);
        expect(result.some((p) => p.x === 10)).toBe(true);
    });
});
