import { describe, expect, it } from 'vitest';
import Line from './Line';
import Arrow from './Arrow';

describe.each([['Line', Line], ['Arrow', Arrow]] as const)('%s', (_name, ShapeClass) => {
    it('copia os pontos recebidos (mover a forma não altera os objetos do chamador)', () => {
        const start = { x: 0, y: 0 };
        const end = { x: 10, y: 10 };
        const shape = new ShapeClass(start, end, {});
        shape.moveBy(5, 5);
        expect(start).toEqual({ x: 0, y: 0 });
        expect(end).toEqual({ x: 10, y: 10 });
        expect(shape.start).toEqual({ x: 5, y: 5 });
    });

    it('alterar o ponto do chamador depois não muda a forma', () => {
        const start = { x: 0, y: 0 };
        const shape = new ShapeClass(start, { x: 10, y: 0 }, {});
        start.x = 99;
        expect(shape.start.x).toBe(0);
    });
});
