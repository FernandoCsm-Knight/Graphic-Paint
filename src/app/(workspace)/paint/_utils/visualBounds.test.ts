import { describe, expect, it } from 'vitest';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import Arrow from '@/app/(workspace)/paint/_shapes/Arrow';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import Hexagon from '@/app/(workspace)/paint/_shapes/Hexagon';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import { getOverlayPadding, getShapeVisualBounds, pixelStrokeExtent } from './visualBounds';

describe('pixelStrokeExtent', () => {
    it('reproduz as células pintadas por drawPixel', () => {
        expect(pixelStrokeExtent(1)).toEqual({ before: 0, after: 0 });
        expect(pixelStrokeExtent(2)).toEqual({ before: 0, after: 1 });
        expect(pixelStrokeExtent(3)).toEqual({ before: 1, after: 1 });
    });
});

describe('getShapeVisualBounds', () => {
    it('reta grossa: inclui metade da espessura em volta', () => {
        const line = new Line({ x: 10, y: 10 }, { x: 110, y: 10 }, { lineWidth: 20 });
        expect(getShapeVisualBounds(line)).toEqual({ x: 0, y: 0, width: 120, height: 20 });
    });

    it('reta horizontal tem altura maior que zero', () => {
        const line = new Line({ x: 0, y: 50 }, { x: 100, y: 50 }, { lineWidth: 1 });
        expect(getShapeVisualBounds(line).height).toBeGreaterThan(0);
    });

    it('seta: inclui a ponta, que sai da caixa geométrica', () => {
        const arrow = new Arrow({ x: 0, y: 50 }, { x: 100, y: 50 }, { lineWidth: 10 });
        const geometric = arrow.getBoundingBox();
        const visual = getShapeVisualBounds(arrow);
        expect(geometric.height).toBe(0);
        const [h1, h2] = arrow.getHeadPoints();
        expect(visual.y).toBeLessThanOrEqual(Math.min(h1.y, h2.y) - 5);
        expect(visual.y + visual.height).toBeGreaterThanOrEqual(Math.max(h1.y, h2.y) + 5);
    });

    it('polígono: caixa geométrica + metade da espessura', () => {
        const hex = new Hexagon({ x: 100, y: 100 }, { x: 150, y: 100 }, { lineWidth: 8 });
        const geo = hex.getBoundingBox();
        expect(getShapeVisualBounds(hex)).toEqual({ x: geo.x - 4, y: geo.y - 4, width: geo.width + 8, height: geo.height + 8 });
    });

    it('modo pixelado: bate com as células pintadas', () => {
        // Reta da célula 2 até a 5 na linha 3, espessura 1, célula de 10px.
        const line = new Line({ x: 2, y: 3 }, { x: 5, y: 3 }, { pixelated: true, pixelSize: 10, lineWidth: 1 });
        expect(getShapeVisualBounds(line)).toEqual({ x: 20, y: 30, width: 40, height: 10 });

        const thick = new Line({ x: 2, y: 3 }, { x: 5, y: 3 }, { pixelated: true, pixelSize: 10, lineWidth: 3 });
        expect(getShapeVisualBounds(thick)).toEqual({ x: 10, y: 20, width: 60, height: 30 });
    });

    it('grupo: união dos filhos', () => {
        const group = new ShapeGroup([
            new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 }, { lineWidth: 2 }),
            new Rectangle({ x: 50, y: 50 }, { x: 60, y: 60 }, { lineWidth: 2 }),
        ], {});
        expect(getShapeVisualBounds(group)).toEqual({ x: -1, y: -1, width: 62, height: 62 });
    });
});

describe('getOverlayPadding', () => {
    it('folga = metade da espessura', () => {
        const rect = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 100 }, { lineWidth: 12 });
        expect(getOverlayPadding(rect, 50, 50, 8)).toEqual({ x: 6, y: 6 });
    });

    it('caixa mínima para reta horizontal', () => {
        const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 }, { lineWidth: 2 });
        const pad = getOverlayPadding(line, 50, 0, 8);
        expect(pad.y).toBe(8);
        expect(pad.x).toBe(1);
    });
});
