import { describe, expect, it } from 'vitest';
import { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import {
    applyCheckpointInterval,
    getSelectableSceneSlice,
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
