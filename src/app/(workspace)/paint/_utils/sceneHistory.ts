import type { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import { findLastCheckpointIndex } from './sceneReplay';

/** Keep a raster checkpoint at most every N items (others are replayed). */
export const CHECKPOINT_INTERVAL = 10;

/** Maximum number of undo steps kept in memory. */
export const MAX_UNDO_STEPS = 50;

/**
 * Called right after `scene[scene.length - 1]` was pushed. If that item holds
 * a snapshot but a checkpoint already exists fewer than `interval` items
 * before it, the snapshot is dropped (when replay is exact) — replay from the
 * previous checkpoint is cheap enough.
 */
export function applyCheckpointInterval(scene: readonly SceneItem[], interval = CHECKPOINT_INTERVAL): void {
    const lastIdx = scene.length - 1;
    if (lastIdx < 0) return;

    const item = scene[lastIdx];
    if (!item.isCheckpoint()) return;

    const previousCheckpoint = findLastCheckpointIndex(scene.slice(0, lastIdx));
    const distance = lastIdx - (previousCheckpoint === -1 ? -1 : previousCheckpoint);

    // With no previous checkpoint, replay starts at item 0 (distance = items to replay).
    if (distance < interval) {
        item.releaseSnapshot();
    }
}

/** Lowest scene length undo may reach, given the current length. */
export function computeUndoFloor(previousFloor: number, length: number, maxSteps = MAX_UNDO_STEPS): number {
    return Math.max(previousFloor, length - maxSteps);
}

/**
 * Frees snapshots that can never be used again: once undo cannot go below
 * `floor`, every replay starts at (or after) the last checkpoint located
 * before `floor` — the "base". Checkpoints older than the base are released.
 * Items stay in the scene (they are still needed for persistence).
 * Returns how many snapshots were released.
 */
export function releaseSnapshotsBeforeFloor(scene: readonly SceneItem[], floor: number): number {
    const base = findLastCheckpointIndex(scene.slice(0, floor));
    let released = 0;

    for (let i = 0; i < base; i++) {
        if (scene[i].isCheckpoint() && scene[i].releaseSnapshot(true)) {
            released++;
        }
    }

    return released;
}

/** Number of items currently holding a raster snapshot. */
export function countCheckpoints(scene: readonly SceneItem[]): number {
    return scene.reduce((total, item) => total + (item.isCheckpoint() ? 1 : 0), 0);
}

/** Slice of the scene after the last barrier (raster items bake what is beneath them). */
export function getSelectableSceneSlice<T extends SceneItem>(scene: T[]): T[] {
    for (let i = scene.length - 1; i >= 0; i--) {
        if (scene[i].isBarrier()) return scene.slice(i);
    }
    return scene;
}
