import { describe, expect, it } from 'vitest';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import Arrow from '@/app/(workspace)/paint/_shapes/Arrow';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import Ellipse from '@/app/(workspace)/paint/_shapes/Ellipse';
import Star from '@/app/(workspace)/paint/_shapes/Star';
import Hexagon from '@/app/(workspace)/paint/_shapes/Hexagon';
import FreePolygon from '@/app/(workspace)/paint/_shapes/FreePolygon';
import BezierCurve from '@/app/(workspace)/paint/_shapes/BezierCurve';
import BSplineCurve from '@/app/(workspace)/paint/_shapes/BSplineCurve';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import { distanceToSegment, findTopmostHit, hitTestShape, shapeIntersectsRect } from './hitTest';

const opts = { lineWidth: 2 };
const TOL = 4;

describe('distanceToSegment', () => {
    it('mede a distância ao segmento (não à reta infinita)', () => {
        expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
        expect(distanceToSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    });
});

describe('hitTestShape', () => {
    it('reta: acerta perto do traço e erra longe', () => {
        const line = new Line({ x: 0, y: 0 }, { x: 100, y: 100 }, opts);
        expect(hitTestShape(line, { x: 50, y: 52 }, TOL)).toBe(true);
        expect(hitTestShape(line, { x: 50, y: 70 }, TOL)).toBe(false);
    });

    it('seta: a ponta também conta', () => {
        const arrow = new Arrow({ x: 0, y: 0 }, { x: 100, y: 0 }, { lineWidth: 10 });
        const [head] = arrow.getHeadPoints();
        expect(hitTestShape(arrow, head, TOL)).toBe(true);
    });

    it('retângulo vazio: borda acerta, centro não', () => {
        const rect = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 60 }, opts);
        expect(hitTestShape(rect, { x: 100, y: 30 }, TOL)).toBe(true);
        expect(hitTestShape(rect, { x: 50, y: 30 }, TOL)).toBe(false);
    });

    it('retângulo preenchido: centro acerta', () => {
        const rect = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 60 }, { ...opts, filled: true });
        expect(hitTestShape(rect, { x: 50, y: 30 }, TOL)).toBe(true);
    });

    it('círculo: contorno acerta, centro e fora não', () => {
        const circle = new Circle({ x: 0, y: 50 }, { x: 100, y: 50 }, opts); // centro (50,50), raio 50
        expect(hitTestShape(circle, { x: 50, y: 1 }, TOL)).toBe(true);
        expect(hitTestShape(circle, { x: 50, y: 50 }, TOL)).toBe(false);
        expect(hitTestShape(circle, { x: 120, y: 50 }, TOL)).toBe(false);
    });

    it('elipse: contorno acerta no eixo maior', () => {
        const ellipse = new Ellipse({ x: 0, y: 0 }, { x: 200, y: 100 }, opts); // centro (100,50), rx 100, ry 50
        expect(hitTestShape(ellipse, { x: 200, y: 50 }, TOL)).toBe(true);
        expect(hitTestShape(ellipse, { x: 100, y: 50 }, TOL)).toBe(false);
    });

    it('estrela e hexágono: vértice acerta, centro não', () => {
        for (const shape of [new Star({ x: 100, y: 100 }, { x: 150, y: 100 }, opts), new Hexagon({ x: 100, y: 100 }, { x: 150, y: 100 }, opts)]) {
            expect(hitTestShape(shape, shape.points[0], TOL)).toBe(true);
            expect(hitTestShape(shape, { x: 100, y: 100 }, TOL)).toBe(false);
        }
    });

    it('polígono livre fecha o contorno', () => {
        const poly = new FreePolygon([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }], opts);
        expect(hitTestShape(poly, { x: 50, y: 50 }, TOL)).toBe(true); // aresta de fechamento
        expect(hitTestShape(poly, { x: 20, y: 20 }, TOL)).toBe(false);
    });

    it('curvas: acerta na curva amostrada, não nos pontos de controle internos', () => {
        const pts = [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }];
        const bezier = new BezierCurve(pts.map((p) => ({ ...p })), opts);
        expect(hitTestShape(bezier, { x: 50, y: 50 }, TOL)).toBe(true); // ponto médio da quadrática
        expect(hitTestShape(bezier, { x: 50, y: 100 }, TOL)).toBe(false); // controle fica fora da curva

        const spline = new BSplineCurve([{ x: 0, y: 0 }, { x: 30, y: 60 }, { x: 70, y: 60 }, { x: 100, y: 0 }], opts);
        expect(hitTestShape(spline, { x: 0, y: 0 }, TOL)).toBe(true);
        expect(hitTestShape(spline, { x: 50, y: 0 }, TOL)).toBe(false);
    });

    it('grupo: acerta se qualquer filho acerta', () => {
        const group = new ShapeGroup([
            new Line({ x: 0, y: 0 }, { x: 10, y: 0 }, opts),
            new Line({ x: 0, y: 100 }, { x: 10, y: 100 }, opts),
        ], {});
        expect(hitTestShape(group, { x: 5, y: 100 }, TOL)).toBe(true);
        expect(hitTestShape(group, { x: 5, y: 50 }, TOL)).toBe(false);
    });

    it('modo pixelado converte células para o centro do pixel', () => {
        const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 }, { pixelated: true, pixelSize: 10, lineWidth: 1 });
        expect(hitTestShape(line, { x: 55, y: 5 }, 1)).toBe(true);
        expect(hitTestShape(line, { x: 55, y: 30 }, 1)).toBe(false);
    });
});

describe('shapeIntersectsRect', () => {
    it('retângulo dentro de um círculo vazio não seleciona o círculo', () => {
        const circle = new Circle({ x: 0, y: 50 }, { x: 100, y: 50 }, opts);
        expect(shapeIntersectsRect(circle, { x: 40, y: 40, width: 20, height: 20 })).toBe(false);
        expect(shapeIntersectsRect(circle, { x: 90, y: 40, width: 20, height: 20 })).toBe(true);
    });

    it('retângulo perto de uma diagonal sem tocá-la não seleciona', () => {
        const line = new Line({ x: 0, y: 0 }, { x: 100, y: 100 }, opts);
        expect(shapeIntersectsRect(line, { x: 60, y: 10, width: 30, height: 30 })).toBe(false);
        expect(shapeIntersectsRect(line, { x: 40, y: 40, width: 30, height: 5 })).toBe(true);
    });

    it('forma inteira dentro do retângulo é selecionada', () => {
        const rect = new Rectangle({ x: 10, y: 10 }, { x: 20, y: 20 }, opts);
        expect(shapeIntersectsRect(rect, { x: 0, y: 0, width: 100, height: 100 })).toBe(true);
    });
});

describe('findTopmostHit', () => {
    it('retorna a forma de cima e ignora itens que não são formas', () => {
        const bottom = new Line({ x: 0, y: 0 }, { x: 100, y: 0 }, opts);
        const top = new Line({ x: 0, y: 0 }, { x: 100, y: 0 }, opts);
        const hole = new ClearRectItem(0, 0, 10, 10);
        expect(findTopmostHit([bottom, top, hole], { x: 50, y: 0 }, TOL)).toBe(top);
        expect(findTopmostHit([bottom, top], { x: 50, y: 50 }, TOL)).toBeNull();
        expect(findTopmostHit([bottom, top], { x: 50, y: 0 }, TOL, (s) => s !== top)).toBe(bottom);
    });
});

describe('shapeIntersectsRect com traço grosso', () => {
    it('seleciona quando só a borda pintada do traço entra no retângulo', () => {
        const line = new Line({ x: 0, y: 50 }, { x: 100, y: 50 }, { lineWidth: 20 });
        // retângulo de y=55 a y=65: não toca a linha central (y=50), mas toca a borda pintada (até y=60)
        expect(shapeIntersectsRect(line, { x: 40, y: 55, width: 20, height: 10 })).toBe(true);
        expect(shapeIntersectsRect(line, { x: 40, y: 65, width: 20, height: 10 })).toBe(false);
    });
});
