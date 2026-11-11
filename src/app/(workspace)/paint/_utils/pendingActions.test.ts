import { describe, expect, it, vi } from 'vitest';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import type { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import { liftFromScene, resolvePendingAction } from './pendingActions';

const line = () => new Line({ x: 0, y: 0 }, { x: 10, y: 10 }, {});
const circle = () => new Circle({ x: 0, y: 0 }, { x: 10, y: 0 }, {});

/** Simulates useMultiSelect lifting + usePendingPlacement resolving. */
function editExisting(scene: SceneItem[], target: SceneItem, action: 'confirm' | 'cancel' | 'delete') {
    let current = scene;
    const replaceScene = (next: SceneItem[]) => { current = next; };
    const pushShape = (item: SceneItem) => { current = [...current, item]; };

    const { remaining, original } = liftFromScene(current, [target]);
    replaceScene(remaining);

    resolvePendingAction(action, target, { onCancel: () => replaceScene(original) }, pushShape);
    return current;
}

describe('liftFromScene', () => {
    it('remove os itens selecionados e guarda a cena original', () => {
        const [a, b, c] = [line(), circle(), line()];
        const { remaining, original } = liftFromScene([a, b, c], [b]);
        expect(remaining).toEqual([a, c]);
        expect(original).toEqual([a, b, c]);
    });
});

describe('resolvePendingAction', () => {
    it('delete apaga uma forma já colocada (não restaura a cena)', () => {
        const [a, b, c] = [line(), circle(), new ClearRectItem(0, 0, 1, 1)];
        const result = editExisting([a, b, c], b, 'delete');
        expect(result).not.toContain(b);
        expect(result).toEqual([a, c]);
    });

    it('cancelar continua restaurando a forma', () => {
        const [a, b] = [line(), circle()];
        expect(editExisting([a, b], b, 'cancel')).toEqual([a, b]);
    });

    it('confirmar sem onConfirm devolve a forma para a cena', () => {
        const [a, b] = [line(), circle()];
        expect(editExisting([a, b], b, 'confirm')).toEqual([a, b]);
    });

    it('delete nunca chama onCancel nem pushShape; chama onDelete', () => {
        const onCancel = vi.fn();
        const onDelete = vi.fn();
        const pushShape = vi.fn();
        resolvePendingAction('delete', line(), { onCancel, onDelete }, pushShape);
        expect(onCancel).not.toHaveBeenCalled();
        expect(pushShape).not.toHaveBeenCalled();
        expect(onDelete).toHaveBeenCalledOnce();
    });

    it('delete de forma recém-criada (sem callbacks) apenas descarta', () => {
        const pushShape = vi.fn();
        resolvePendingAction('delete', line(), {}, pushShape);
        expect(pushShape).not.toHaveBeenCalled();
    });

    it('confirmar com onConfirm não empurra a forma diretamente', () => {
        const onConfirm = vi.fn();
        const pushShape = vi.fn();
        resolvePendingAction('confirm', line(), { onConfirm }, pushShape);
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(pushShape).not.toHaveBeenCalled();
    });
});
