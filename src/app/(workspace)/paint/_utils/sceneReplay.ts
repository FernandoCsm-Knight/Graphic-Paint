import type { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';

type ReplayContext = Pick<CanvasRenderingContext2D, 'clearRect' | 'canvas'>;

function clearCanvas(ctx: ReplayContext) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** Index of the most recent checkpoint in the scene, or -1 if there is none. */
export function findLastCheckpointIndex(scene: readonly SceneItem[]): number {
    for (let i = scene.length - 1; i >= 0; i--) {
        if (scene[i].isCheckpoint()) return i;
    }
    return -1;
}

/**
 * Replay the scene onto ctx, starting from the last checkpoint.
 *
 * The canvas is always cleared first: a checkpoint captured before the canvas
 * grew only covers the old area, so putImageData alone would leave stale
 * pixels in the newly added region.
 */
export function replayScene(scene: readonly SceneItem[], ctx: CanvasRenderingContext2D): void {
    clearCanvas(ctx);

    const startIdx = Math.max(0, findLastCheckpointIndex(scene));
    for (let i = startIdx; i < scene.length; i++) {
        scene[i].draw(ctx);
    }
}

/**
 * Draw a single item being redone on top of the current canvas state.
 * Checkpoints replace the whole bitmap, so the canvas is cleared before them.
 */
export function drawRedoItem(item: SceneItem, ctx: CanvasRenderingContext2D): void {
    if (item.isCheckpoint()) clearCanvas(ctx);
    item.draw(ctx);
}
