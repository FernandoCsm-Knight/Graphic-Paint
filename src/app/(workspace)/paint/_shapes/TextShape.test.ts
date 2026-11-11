import { describe, expect, it } from 'vitest';
import TextShape, { measureTextBlock } from './TextShape';
import { deserializePaintScene, serializePaintScene } from '../_utils/scenePersistence';
import { hitTestShape } from '../_utils/hitTest';
import { getEditableShapes } from '../_utils/erasure';
import { cloneSceneItem } from '../_utils/cloneSceneItem';
import FreeForm from './FreeForm';

const text = (value = 'Olá', size = 20) => new TextShape(value, 100, 50, size, { strokeStyle: '#ff0000' });

describe('TextShape', () => {
    it('nasce com a caixa do tamanho natural do texto', () => {
        const shape = text('abc\nde', 20);
        const natural = measureTextBlock('abc\nde', 20);
        expect(shape.getOverlayBounds()).toEqual({ x: 100, y: 50, width: natural.width, height: natural.height });
        expect(natural.height).toBe(Math.ceil(2 * 20 * 1.25));
    });

    it('mover e redimensionar alteram a caixa', () => {
        const shape = text();
        shape.moveBy(10, -5);
        expect(shape.x).toBe(110);
        shape.resizeToBoundingBox({ x: 0, y: 0, width: 300, height: 90 });
        expect(shape.getOverlayBounds()).toEqual({ x: 0, y: 0, width: 300, height: 90 });
    });

    it('girar mantém o centro e guarda o ângulo', () => {
        const shape = text();
        const center = shape.getCenter();
        shape.beginRotate();
        shape.rotateBy(Math.PI / 4, center);
        shape.endRotate();
        expect(shape.getVisualRotation()).toBeCloseTo(Math.PI / 4);
        expect(shape.getCenter().x).toBeCloseTo(center.x);
        expect(shape.getCenter().y).toBeCloseTo(center.y);
    });

    it('editar o texto mantém posição e o esticamento aplicado', () => {
        const shape = text('ab', 20);
        shape.resizeToBoundingBox({ x: 100, y: 50, width: shape.width * 2, height: shape.height });
        shape.setText('abcd');
        expect(shape.x).toBe(100);
        expect(shape.width).toBeCloseTo(measureTextBlock('abcd', 20).width * 2);
    });

    it('clique em qualquer ponto da caixa acerta o texto', () => {
        const shape = text('Olá mundo', 20);
        expect(hitTestShape(shape, shape.getCenter(), 2)).toBe(true);
        expect(hitTestShape(shape, { x: 0, y: 0 }, 2)).toBe(false);
    });

    it('salvar e recarregar preserva texto, caixa, cor e rotação', async () => {
        const shape = text('linha 1\nlinha 2', 30);
        shape.resizeToBoundingBox({ x: 10, y: 20, width: 400, height: 120 });
        shape.rotation = 0.3;
        const [restored] = await deserializePaintScene(await serializePaintScene([shape]));
        const t = restored as TextShape;
        expect(t).toBeInstanceOf(TextShape);
        expect(t.text).toBe('linha 1\nlinha 2');
        expect(t.fontSize).toBe(30);
        expect(t.strokeStyle).toBe('#ff0000');
        expect(t.getOverlayBounds()).toEqual({ x: 10, y: 20, width: 400, height: 120 });
        expect(t.rotation).toBeCloseTo(0.3);
    });

    it('cópia para edição é independente', () => {
        const shape = text();
        const copy = cloneSceneItem(shape);
        copy.setText('outro');
        copy.moveBy(5, 5);
        expect(shape.text).toBe('Olá');
        expect(shape.x).toBe(100);
    });

    it('texto apagado pela borracha deixa de ser editável', () => {
        const shape = text('Olá', 20);
        const c = shape.getCenter();
        const eraser = new FreeForm([{ ...c }, { x: c.x + 2, y: c.y }], { isEraser: true, lineWidth: 6 });
        expect(getEditableShapes([shape])).toContain(shape);
        expect(getEditableShapes([shape, eraser])).not.toContain(shape);
    });

    it('modo pixelado usa células inteiras (caixa inclusiva)', () => {
        const shape = new TextShape('A', 3, 4, 9, { pixelated: true, pixelSize: 10 });
        const natural = measureTextBlock('A', 9);
        expect(shape.width).toBe(natural.width - 1);
        expect(shape.height).toBe(natural.height - 1);
        shape.moveBy(1.4, 2.6);
        expect(shape.x).toBe(4);
        expect(shape.y).toBe(7);
    });
});
