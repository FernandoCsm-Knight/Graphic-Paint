import { describe, expect, it } from 'vitest';
import { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import {
    applyCheckpointInterval,
    computeUndoFloor,
    countCheckpoints,
    getSelectableSceneSlice,
    releaseSnapshotsBeforeFloor,
} from './sceneHistory';

/** Vector item: never a checkpoint. */
class Vector extends SceneItem {
    draw() {}
}

/** Raster item like FreeForm/FillShape: holds a snapshot after commit. */
class Raster extends SceneItem {
    hasSnapshot = true;
    constructor(private exactReplay = true) { super(); }
    draw() {}
    override isCheckpoint() { return this.hasSnapshot; }
    override requiresSnapshot() { return true; }
    override releaseSnapshot(force = false) {
        if (!this.hasSnapshot) return false;
        if (!force && !this.exactReplay) return false;
        this.hasSnapshot = false;
        return true;
    }
}

/** Pure raster checkpoint (no vector data): can never release. */
class PureRaster extends SceneItem {
    draw() {}
    override isCheckpoint() { return true; }
}

/** Simulates useScene.pushShape with the history policy. */
function simulate(items: SceneItem[], interval: number, maxSteps: number) {
    const scene: SceneItem[] = [];
    let floor = 0;
    for (const item of items) {
        scene.push(item);
        applyCheckpointInterval(scene, interval);
        const next = computeUndoFloor(floor, scene.length, maxSteps);
        if (next !== floor) {
            floor = next;
            releaseSnapshotsBeforeFloor(scene, floor);
        }
    }
    return { scene, floor };
}

describe('applyCheckpointInterval', () => {
    it('libera snapshot quando o checkpoint anterior está perto', () => {
        const scene: SceneItem[] = [new Raster()];
        for (let i = 0; i < 3; i++) scene.push(new Vector());
        scene.push(new Raster());
        applyCheckpointInterval(scene, 10);
        expect(scene[4].isCheckpoint()).toBe(false);
        expect(scene[0].isCheckpoint()).toBe(true);
    });

    it('mantém snapshot quando a distância atinge o intervalo', () => {
        const scene: SceneItem[] = [new Raster()];
        for (let i = 0; i < 9; i++) scene.push(new Vector());
        scene.push(new Raster());
        applyCheckpointInterval(scene, 10);
        expect(scene[10].isCheckpoint()).toBe(true);
    });

    it('não libera itens cujo replay não é exato (spray)', () => {
        const scene: SceneItem[] = [new Raster(), new Raster(false)];
        applyCheckpointInterval(scene, 10);
        expect(scene[1].isCheckpoint()).toBe(true);
    });
});

describe('computeUndoFloor', () => {
    it('só cresce e limita a quantidade de passos', () => {
        expect(computeUndoFloor(0, 10, 50)).toBe(0);
        expect(computeUndoFloor(0, 60, 50)).toBe(10);
        expect(computeUndoFloor(10, 40, 50)).toBe(10);
    });
});

describe('releaseSnapshotsBeforeFloor', () => {
    it('libera checkpoints anteriores ao checkpoint base, inclusive spray', () => {
        const scene = [new Raster(), new Raster(false), new Vector(), new Raster(), new Vector(), new Raster()];
        const released = releaseSnapshotsBeforeFloor(scene, 4);
        // base = índice 3 (último checkpoint antes do piso 4)
        expect(released).toBe(2);
        expect(scene.map((item) => item.isCheckpoint())).toEqual([false, false, false, true, false, true]);
    });

    it('nunca libera checkpoint puramente raster', () => {
        const scene = [new PureRaster(), new Raster(), new Raster()];
        releaseSnapshotsBeforeFloor(scene, 3);
        expect(scene[0].isCheckpoint()).toBe(true);
    });
});

describe('política completa', () => {
    it('limita a quantidade de snapshots vivos em uma sessão longa de pinceladas', () => {
        const interval = 10;
        const maxSteps = 50;
        const strokes = Array.from({ length: 500 }, () => new Raster());
        const { scene, floor } = simulate(strokes, interval, maxSteps);

        expect(scene).toHaveLength(500);
        expect(floor).toBe(450);
        // janela de 50 passos / intervalo 10 + checkpoint base
        expect(countCheckpoints(scene)).toBeLessThanOrEqual(maxSteps / interval + 1);
    });

    it('nunca libera, dentro da janela de desfazer, itens cujo replay não é exato', () => {
        const items: SceneItem[] = [];
        for (let i = 0; i < 200; i++) {
            items.push(i % 7 === 0 ? new Raster(false) : i % 3 === 0 ? new Raster() : new Vector());
        }
        const { scene, floor } = simulate(items, 10, 50);

        // Para todo tamanho alcançável por desfazer, o replay começa no último
        // checkpoint; nenhum item de replay inexato pode estar depois dele sem snapshot.
        for (let length = scene.length; length >= floor; length--) {
            const visible = scene.slice(0, length);
            const start = Math.max(0, visible.map((item) => item.isCheckpoint()).lastIndexOf(true));
            const replayed = visible.slice(start);
            const inexactWithoutSnapshot = replayed.filter(
                (item) => item instanceof Raster && !item.isCheckpoint() && !(item as Raster)['exactReplay']
            );
            expect(inexactWithoutSnapshot).toEqual([]);
        }
    });
});

describe('getSelectableSceneSlice', () => {
    it('corta na última barreira raster mesmo sem snapshot', () => {
        const released = new Raster();
        released.releaseSnapshot(true);
        const scene = [new Vector(), released, new Vector(), new Vector()];
        expect(getSelectableSceneSlice(scene)).toEqual(scene.slice(1));
    });

    it('retorna a cena toda quando não há barreira', () => {
        const scene = [new Vector(), new Vector()];
        expect(getSelectableSceneSlice(scene)).toEqual(scene);
    });
});
