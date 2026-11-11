import { describe, expect, it } from 'vitest';
import generator from '@/app/(workspace)/paint/_types/ShapeGenerator';
import type Line from '@/app/(workspace)/paint/_shapes/Line';
import { computeDragBox, computeDragLine, fitPointsToBox, regularPolygonUnit } from './dragShapeGeometry';

const build = (kind: string, start = { x: 100, y: 50 }, end = { x: 300, y: 170 }, modifiers = {}, pixelated = false) =>
    generator({ start, end, kind, color: '#000', thickness: 1, pixelated, pixelSize: 10, modifiers });

const closeBox = (actual: { x: number; y: number; width: number; height: number }, expected: typeof actual) => {
    expect(actual.x).toBeCloseTo(expected.x, 6);
    expect(actual.y).toBeCloseTo(expected.y, 6);
    expect(actual.width).toBeCloseTo(expected.width, 6);
    expect(actual.height).toBeCloseTo(expected.height, 6);
};

describe('computeDragBox', () => {
    it('canto a canto em qualquer direção', () => {
        expect(computeDragBox({ x: 10, y: 10 }, { x: 4, y: 30 })).toEqual({ x: 4, y: 10, width: 6, height: 20 });
    });

    it('Shift deixa quadrado com o maior lado, na direção do arraste', () => {
        expect(computeDragBox({ x: 10, y: 10 }, { x: 0, y: 40 }, { proportional: true })).toEqual({ x: -20, y: 10, width: 30, height: 30 });
    });

    it('Alt usa o ponto inicial como centro', () => {
        expect(computeDragBox({ x: 50, y: 50 }, { x: 60, y: 80 }, { fromCenter: true })).toEqual({ x: 40, y: 20, width: 20, height: 60 });
    });
});

describe('fitPointsToBox', () => {
    it('estica os pontos para preencher a caixa', () => {
        const points = fitPointsToBox(regularPolygonUnit(3), { x: 0, y: 0, width: 100, height: 50 });
        expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(0);
        expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(100);
        expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(0);
        expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(50);
    });
});

describe('formas inscritas na caixa do arraste', () => {
    const box = { x: 100, y: 50, width: 200, height: 120 };

    it.each(['rect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'star'])(
        '%s preenche exatamente a caixa',
        (kind) => {
            closeBox(build(kind).getBoundingBox(), box);
        },
    );

    it('o arraste para cima/esquerda produz a mesma caixa', () => {
        closeBox(build('hexagon', { x: 300, y: 170 }, { x: 100, y: 50 }).getBoundingBox(), box);
    });

    it('a direção do arraste não gira a forma (triângulo sempre apontando para cima)', () => {
        const triangle = build('triangle', { x: 300, y: 170 }, { x: 100, y: 50 }) as unknown as { points: { x: number; y: number }[] };
        const top = triangle.points.reduce((a, b) => (b.y < a.y ? b : a));
        expect(top.x).toBeCloseTo(200);
        expect(top.y).toBeCloseTo(50);
    });

    it('quadrado e círculo são sempre proporcionais', () => {
        closeBox(build('square').getBoundingBox(), { x: 100, y: 50, width: 200, height: 200 });
        closeBox(build('circle').getBoundingBox(), { x: 100, y: 50, width: 200, height: 200 });
    });

    it('Shift mantém a proporção', () => {
        const bb = build('hexagon', undefined, undefined, { shift: true }).getBoundingBox();
        expect(bb.width).toBeCloseTo(bb.height);
    });

    it('Alt desenha a partir do centro', () => {
        const bb = build('star', { x: 200, y: 200 }, { x: 260, y: 230 }, { alt: true }).getBoundingBox();
        closeBox(bb, { x: 140, y: 170, width: 120, height: 60 });
    });

    it('modo pixelado gera vértices inteiros dentro da caixa', () => {
        const shape = build('pentagon', { x: 2, y: 3 }, { x: 13, y: 10 }, {}, true) as unknown as { points: { x: number; y: number }[] };
        expect(shape.points.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true);
        expect(Math.min(...shape.points.map((p) => p.x))).toBe(2);
        expect(Math.max(...shape.points.map((p) => p.x))).toBe(13);
    });
});

describe('reta e seta', () => {
    it('sem modificador vai do ponto inicial ao ponteiro', () => {
        const line = build('line', { x: 0, y: 0 }, { x: 30, y: 10 }) as Line;
        expect(line.start).toEqual({ x: 0, y: 0 });
        expect(line.end).toEqual({ x: 30, y: 10 });
    });

    it('Shift prende a direção em múltiplos de 45°', () => {
        const { end } = computeDragLine({ x: 0, y: 0 }, { x: 100, y: 10 }, { shift: true });
        expect(end.x).toBeCloseTo(Math.hypot(100, 10));
        expect(end.y).toBeCloseTo(0);
    });

    it('Alt espelha a partir do ponto inicial', () => {
        const { start, end } = computeDragLine({ x: 50, y: 50 }, { x: 70, y: 60 }, { alt: true });
        expect(start).toEqual({ x: 30, y: 40 });
        expect(end).toEqual({ x: 70, y: 60 });
    });
});
