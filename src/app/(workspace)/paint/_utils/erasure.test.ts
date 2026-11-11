import { describe, expect, it } from 'vitest';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import FreeForm from '@/app/(workspace)/paint/_shapes/FreeForm';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import { getEditableShapes, isShapeErasedBy } from './erasure';

const eraser = (points: { x: number; y: number }[], lineWidth = 10) =>
    new FreeForm(points.map((p) => ({ ...p })), { isEraser: true, lineWidth });
const brush = (points: { x: number; y: number }[]) =>
    new FreeForm(points.map((p) => ({ ...p })), { isEraser: false, lineWidth: 10 });

describe('isShapeErasedBy', () => {
    const rect = () => new Rectangle({ x: 0, y: 0 }, { x: 100, y: 100 }, { lineWidth: 2 });

    it('borracha passando pela borda apaga parte da forma', () => {
        expect(isShapeErasedBy(rect(), eraser([{ x: 50, y: -20 }, { x: 50, y: 20 }]))).toBe(true);
    });

    it('borracha perto, mas sem tocar no traço, não conta', () => {
        expect(isShapeErasedBy(rect(), eraser([{ x: 50, y: -40 }, { x: 60, y: -40 }]))).toBe(false);
    });

    it('borracha só no miolo de um retângulo vazio não apaga nada dele', () => {
        expect(isShapeErasedBy(rect(), eraser([{ x: 40, y: 40 }, { x: 60, y: 60 }]))).toBe(false);
    });

    it('borracha no miolo de uma forma preenchida apaga', () => {
        const filled = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 100 }, { lineWidth: 2, filled: true });
        expect(isShapeErasedBy(filled, eraser([{ x: 40, y: 40 }, { x: 60, y: 60 }]))).toBe(true);
    });

    it('pincel comum não apaga', () => {
        expect(isShapeErasedBy(rect(), brush([{ x: 50, y: -20 }, { x: 50, y: 20 }]))).toBe(false);
    });

    it('apagar página / recorte (ClearRect) sobre a forma apaga', () => {
        expect(isShapeErasedBy(rect(), new ClearRectItem(0, 80, 500, 500))).toBe(true);
        expect(isShapeErasedBy(rect(), new ClearRectItem(0, 300, 500, 500))).toBe(false);
    });

    it('borracha grossa alcança o traço pela largura', () => {
        const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 }, { lineWidth: 2 });
        expect(isShapeErasedBy(line, eraser([{ x: 50, y: 20 }], 40))).toBe(true);
        expect(isShapeErasedBy(line, eraser([{ x: 50, y: 30 }], 40))).toBe(false);
    });
});

describe('getEditableShapes', () => {
    it('forma apagada pela borracha deixa de ser selecionável; as outras continuam', () => {
        const erasedCircle = new Circle({ x: 0, y: 50 }, { x: 100, y: 50 }, { lineWidth: 2 });
        const untouched = new Rectangle({ x: 300, y: 300 }, { x: 400, y: 400 }, { lineWidth: 2 });
        const scene = [erasedCircle, untouched, eraser([{ x: -10, y: 50 }, { x: 110, y: 50 }], 120)];
        const editable = getEditableShapes(scene);
        expect(editable).not.toContain(erasedCircle);
        expect(editable).toContain(untouched);
    });

    it('a borracha só afeta formas desenhadas ANTES dela', () => {
        const before = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 100 }, { lineWidth: 2 });
        const after = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 100 }, { lineWidth: 2 });
        const scene = [before, eraser([{ x: 50, y: -20 }, { x: 50, y: 20 }]), after];
        const editable = getEditableShapes(scene);
        expect(editable).not.toContain(before);
        expect(editable).toContain(after);
    });

    it('desfazer a borracha (tirar da cena) devolve a forma à seleção', () => {
        const shape = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 100 }, { lineWidth: 2 });
        const stroke = eraser([{ x: 50, y: -20 }, { x: 50, y: 20 }]);
        expect(getEditableShapes([shape, stroke])).not.toContain(shape);
        expect(getEditableShapes([shape])).toContain(shape);
    });
});
