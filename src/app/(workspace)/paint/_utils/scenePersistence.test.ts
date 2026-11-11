import { describe, expect, it } from 'vitest';
import type { ShapeOptions, SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import Arrow from '@/app/(workspace)/paint/_shapes/Arrow';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import Square from '@/app/(workspace)/paint/_shapes/Square';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import Ellipse from '@/app/(workspace)/paint/_shapes/Ellipse';
import Triangle from '@/app/(workspace)/paint/_shapes/Triangle';
import Star from '@/app/(workspace)/paint/_shapes/Star';
import FreePolygon from '@/app/(workspace)/paint/_shapes/FreePolygon';
import BezierCurve from '@/app/(workspace)/paint/_shapes/BezierCurve';
import BSplineCurve from '@/app/(workspace)/paint/_shapes/BSplineCurve';
import FreeForm from '@/app/(workspace)/paint/_shapes/FreeForm';
import FillShape from '@/app/(workspace)/paint/_shapes/FillShape';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import { deserializePaintScene, serializePaintScene } from './scenePersistence';

const opts: ShapeOptions = {
    strokeStyle: '#ff0000',
    fillStyle: '#00ff00',
    lineWidth: 3,
    filled: true,
    pixelated: false,
    pixelSize: 10,
    lineAlgorithm: 'dda',
    lineDash: [],
};

function buildScene(): SceneItem[] {
    const a = { x: 10, y: 20 };
    const b = { x: 110, y: 80 };
    const controlPoints = [{ x: 0, y: 0 }, { x: 30, y: 60 }, { x: 70, y: -10 }, { x: 100, y: 40 }];

    return [
        new Line(a, b, opts),
        new Arrow(a, b, opts),
        new Rectangle(a, b, opts),
        new Square(a, b, opts),
        new Circle(a, b, opts),
        new Ellipse(a, b, opts),
        new Triangle(a, b, opts),
        new Star(a, b, opts),
        new FreePolygon([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 40 }], opts),
        new BezierCurve(controlPoints.map((p) => ({ ...p })), opts),
        new BSplineCurve(controlPoints.map((p) => ({ ...p })), opts),
        new FreeForm([{ x: 1, y: 1 }, { x: 5, y: 9 }, { x: 12, y: 4 }], {
            ...opts,
            isEraser: false,
            brushStyle: 'hard',
        }),
        new FillShape({ strokeStyle: '#123456', pixelated: true, pixelSize: 8, isEraser: false, algorithm: 'floodfill', point: { x: 7, y: 9 } }),
        new ClearRectItem(5, 6, 70, 80),
        new ShapeGroup([new Line(a, b, opts), new Circle(a, b, opts)], opts),
    ];
}

describe('scenePersistence', () => {
    it('serializa todos os tipos vetoriais com os kinds esperados', async () => {
        const serialized = await serializePaintScene(buildScene());

        expect(serialized.map((item) => item.kind)).toEqual([
            'line', 'arrow', 'rect', 'square', 'circle', 'ellipse', 'triangle', 'star',
            'polygon', 'bezier', 'bspline', 'freeform', 'floodfill', 'clearrect', 'group',
        ]);
        expect(serialized.map((item) => item.position)).toEqual(serialized.map((_, i) => i));
    });

    it('ida e volta preserva os dados da cena', async () => {
        const first = await serializePaintScene(buildScene());
        const restored = await deserializePaintScene(first);
        const second = await serializePaintScene(restored);

        expect(restored).toHaveLength(first.length);
        expect(second).toEqual(first);
    });

    it('preserva propriedades de estilo e geometria', async () => {
        const [line] = await deserializePaintScene(await serializePaintScene([new Line({ x: 1, y: 2 }, { x: 3, y: 4 }, opts)]));

        expect(line).toBeInstanceOf(Line);
        const restoredLine = line as Line;
        expect(restoredLine.start).toEqual({ x: 1, y: 2 });
        expect(restoredLine.end).toEqual({ x: 3, y: 4 });
        expect(restoredLine.strokeStyle).toBe('#ff0000');
        expect(restoredLine.lineWidth).toBe(3);
        expect(restoredLine.lineAlgorithm).toBe('dda');
    });

    it('ordena pela posição ao desserializar e ignora kinds desconhecidos', async () => {
        const restored = await deserializePaintScene([
            { position: 1, kind: 'clearrect', data: { x: 0, y: 0, w: 1, h: 1 } },
            { position: 0, kind: 'line', data: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
            { position: 2, kind: 'desconhecido', data: {} },
        ]);

        expect(restored).toHaveLength(2);
        expect(restored[0]).toBeInstanceOf(Line);
        expect(restored[1]).toBeInstanceOf(ClearRectItem);
    });
});

describe('caixa de transformação de formas giradas', () => {
    it('retângulo girado preserva caixa orientada e rotação ao salvar e recarregar', async () => {
        const rect = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 40 }, opts);
        rect.beginRotate();
        rect.rotateBy(Math.PI / 6, rect.getCenter());
        rect.endRotate();
        const bounds = rect.getOverlayBounds();
        const rotation = rect.getVisualRotation();
        expect(rotation).toBeCloseTo(Math.PI / 6);

        const [restored] = await deserializePaintScene(await serializePaintScene([rect]));
        const restoredRect = restored as Rectangle;

        expect(restoredRect.getVisualRotation()).toBeCloseTo(rotation);
        expect(restoredRect.getOverlayBounds().width).toBeCloseTo(bounds.width);
        expect(restoredRect.getOverlayBounds().height).toBeCloseTo(bounds.height);
        expect(restoredRect.getOverlayBounds().x).toBeCloseTo(bounds.x);
        expect(restoredRect.getOverlayBounds().y).toBeCloseTo(bounds.y);
        // A caixa orientada mantém as dimensões originais (100 x 40), não a do AABB girado.
        expect(restoredRect.getOverlayBounds().width).toBeCloseTo(100);
        expect(restoredRect.getOverlayBounds().height).toBeCloseTo(40);
    });

    it('formas sem rotação não gravam caixa de transformação', async () => {
        const [saved] = await serializePaintScene([new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 }, opts)]);
        expect((saved.data as Record<string, unknown>).transform).toBeUndefined();
    });

    it('projetos antigos sem caixa continuam carregando', async () => {
        const [restored] = await deserializePaintScene([
            { position: 0, kind: 'rect', data: { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] } },
        ]);
        expect((restored as Rectangle).getVisualRotation()).toBe(0);
    });
});
