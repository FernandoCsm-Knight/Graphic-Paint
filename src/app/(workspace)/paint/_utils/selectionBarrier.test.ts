import { describe, expect, it } from 'vitest';
import { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import FreeForm from '@/app/(workspace)/paint/_shapes/FreeForm';
import FillShape from '@/app/(workspace)/paint/_shapes/FillShape';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import { getSelectableSceneSlice } from './sceneHistory';
import { SceneHistory } from './sceneOperations';
import { replayScene } from './sceneReplay';

const rect = () => new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 }, {});
const stroke = () => new FreeForm([{ x: 0, y: 0 }, { x: 5, y: 5 }], { isEraser: false });
const fill = () => new FillShape({ point: { x: 1, y: 1 } });

describe('formas continuam selecionáveis', () => {
    it('forma → pincelada: a forma continua selecionável', () => {
        const shape = rect();
        const scene = [shape, stroke()];
        expect(getSelectableSceneSlice(scene)).toContain(shape);
    });

    it('forma → apagar página (ClearRect): a forma continua selecionável', () => {
        const shape = rect();
        expect(getSelectableSceneSlice([shape, new ClearRectItem(0, 0, 5, 5)])).toContain(shape);
    });

    it('forma → balde: a forma deixa de ser selecionável', () => {
        const shape = rect();
        const bucket = fill();
        const slice = getSelectableSceneSlice([shape, bucket]);
        expect(slice).not.toContain(shape);
        expect(slice[0]).toBe(bucket);
    });
});

/** Records what is drawn; a checkpoint "draws" everything it captured. */
class Probe extends SceneItem {
    constructor(public label: string, public captured: string[] | null = null) { super(); }
    draw(ctx: CanvasRenderingContext2D) {
        const log = (ctx as unknown as { log: string[] }).log;
        if (this.captured) log.push(...this.captured);
        else log.push(this.label);
    }
    override isCheckpoint() { return this.captured !== null; }
    override requiresSnapshot() { return true; }
    override isBarrier() { return false; }
    override releaseSnapshot() {
        if (!this.captured) return false;
        this.captured = null;
        return true;
    }
}

function drawn(scene: readonly SceneItem[]): string[] {
    const ctx = { log: [] as string[], canvas: { width: 1, height: 1 }, clearRect() { this.log.length = 0; } };
    replayScene(scene, ctx as unknown as CanvasRenderingContext2D);
    return ctx.log;
}

describe('levantar forma antes de um checkpoint', () => {
    it('o replay da cena transitória não mostra a forma levantada', () => {
        const shape = new Probe('forma');
        const brush = new Probe('pincel', ['forma', 'pincel']); // checkpoint com a forma "assada"
        const history = new SceneHistory();
        history.reset([shape, brush]);
        expect(drawn(history.scene)).toEqual(['forma', 'pincel']);

        history.setTransient([brush]); // forma levantada para edição
        expect(drawn(history.scene)).toEqual(['pincel']);
        expect(brush.isCheckpoint()).toBe(false);
    });

    it('remover a forma em definitivo também não deixa fantasma', () => {
        const shape = new Probe('forma');
        const brush = new Probe('pincel', ['forma', 'pincel']);
        const history = new SceneHistory();
        history.reset([shape, brush]);

        history.replace([brush]);
        expect(drawn(history.scene)).toEqual(['pincel']);

        history.undo();
        expect(drawn(history.scene)).toEqual(['forma', 'pincel']);
    });
});
