import { describe, expect, it } from 'vitest';
import { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import { cloneSceneItem } from './cloneSceneItem';
import { replaceItemsInPlace, SceneHistory } from './sceneOperations';
import { countCheckpoints } from './sceneHistory';

const rect = () => new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 }, {});
const circle = () => new Circle({ x: 0, y: 0 }, { x: 10, y: 0 }, {});

/** Raster item like FreeForm/FillShape: holds a snapshot after commit. */
class Raster extends SceneItem {
    hasSnapshot = true;
    draw() {}
    override isCheckpoint() { return this.hasSnapshot; }
    override requiresSnapshot() { return true; }
    override releaseSnapshot() {
        if (!this.hasSnapshot) return false;
        this.hasSnapshot = false;
        return true;
    }
}

/** Simulates useMultiSelect: lift → edit clone → confirm/delete/cancel. */
function editExisting(history: SceneHistory, target: SceneItem, edit: (clone: Rectangle) => void, action: 'confirm' | 'delete' | 'cancel') {
    const original = [...history.scene];
    const clone = cloneSceneItem(target as Rectangle);
    history.setTransient(original.filter((item) => item !== target));
    edit(clone);
    if (action === 'cancel') {
        history.setTransient(original);
    } else {
        const replacement = action === 'confirm' ? [clone] : [];
        history.replace(replaceItemsInPlace(original, new Map([[target, replacement]])), original);
    }
    return clone;
}

describe('cloneSceneItem', () => {
    it('cria cópia profunda da mesma classe', () => {
        const original = rect();
        const copy = cloneSceneItem(original);
        expect(copy).toBeInstanceOf(Rectangle);
        expect(copy.points).toEqual(original.points);
        copy.moveBy(5, 5);
        expect(original.points[0]).toEqual({ x: 0, y: 0 });
        expect(copy.points[0]).toEqual({ x: 5, y: 5 });
    });

    it('copia os filhos de um grupo', () => {
        const child = new Line({ x: 0, y: 0 }, { x: 4, y: 0 }, {});
        const group = new ShapeGroup([child], {});
        const copy = cloneSceneItem(group);
        copy.moveBy(1, 1);
        expect(child.start).toEqual({ x: 0, y: 0 });
        expect(copy.shapes[0]).not.toBe(child);
    });
});

describe('replaceItemsInPlace', () => {
    it('mantém a ordem de desenho e permite apagar ou expandir', () => {
        const [a, b, c] = [rect(), circle(), rect()];
        const b2 = circle();
        expect(replaceItemsInPlace([a, b, c], new Map([[b, [b2]]]))).toEqual([a, b2, c]);
        expect(replaceItemsInPlace([a, b, c], new Map([[b, []]]))).toEqual([a, c]);
        expect(replaceItemsInPlace([a, b, c], new Map([[b, [b2, b]]]))).toEqual([a, b2, b, c]);
    });
});

describe('SceneHistory — editar formas já colocadas', () => {
    it('mover existente + desfazer volta à posição original; refazer aplica de novo', () => {
        const history = new SceneHistory();
        const [a, b] = [rect(), circle()];
        history.push(a);
        history.push(b);

        const moved = editExisting(history, a, (clone) => clone.moveBy(100, 0), 'confirm');
        expect(history.scene).toEqual([moved, b]);
        expect(moved.points[0].x).toBe(100);

        history.undo();
        expect(history.scene).toEqual([a, b]);
        expect(a.points[0].x).toBe(0);

        history.redo();
        expect(history.scene).toEqual([moved, b]);
    });

    it('excluir existente + desfazer traz a forma de volta', () => {
        const history = new SceneHistory();
        const [a, b] = [rect(), circle()];
        history.push(a);
        history.push(b);

        editExisting(history, a, () => {}, 'delete');
        expect(history.scene).toEqual([b]);

        history.undo();
        expect(history.scene).toEqual([a, b]);
    });

    it('cancelar a edição mantém a geometria original e não cria passo de desfazer', () => {
        const history = new SceneHistory();
        const a = rect();
        history.push(a);

        editExisting(history, a, (clone) => clone.moveBy(50, 50), 'cancel');
        expect(history.scene).toEqual([a]);
        expect(a.points[0]).toEqual({ x: 0, y: 0 });
        expect(history.undoDepth).toBe(1);
    });

    it('preserva a ordem de desenho (forma apagada parcialmente continua abaixo do apagamento)', () => {
        const history = new SceneHistory();
        const a = rect();
        const hole = new ClearRectItem(0, 0, 5, 5);
        history.push(a);
        history.push(hole);

        const moved = editExisting(history, a, (clone) => clone.moveBy(1, 0), 'confirm');
        expect(history.scene).toEqual([moved, hole]);
    });

    it('nova ação depois de desfazer limpa o refazer', () => {
        const history = new SceneHistory();
        history.push(rect());
        history.undo();
        expect(history.redoDepth).toBe(1);
        history.push(circle());
        expect(history.redoDepth).toBe(0);
    });

    it('edição libera checkpoints posteriores à forma editada', () => {
        const history = new SceneHistory();
        const a = rect();
        const stroke = new Raster();
        history.push(a);
        history.push(stroke);
        // stroke perto do início → liberado pelo intervalo; força um checkpoint:
        stroke.hasSnapshot = true;

        editExisting(history, a, (clone) => clone.moveBy(3, 0), 'confirm');
        expect(stroke.isCheckpoint()).toBe(false);
    });
});

describe('SceneHistory — limites', () => {
    it('limita a quantidade de passos de desfazer', () => {
        const history = new SceneHistory(5, 10);
        for (let i = 0; i < 20; i++) history.push(rect());
        let undone = 0;
        while (history.undo()) undone++;
        expect(undone).toBe(5);
        expect(history.scene).toHaveLength(15);
    });

    it('mantém poucos snapshots vivos numa sessão longa de pinceladas', () => {
        const history = new SceneHistory(50, 10);
        const strokes = Array.from({ length: 500 }, () => new Raster());
        for (const stroke of strokes) history.push(stroke);
        expect(countCheckpoints(history.scene)).toBeLessThanOrEqual(50 / 10 + 1);
    });

    it('reset limpa o histórico', () => {
        const history = new SceneHistory();
        history.push(rect());
        history.reset([circle()]);
        expect(history.undo()).toBeNull();
        expect(history.scene).toHaveLength(1);
    });
});
