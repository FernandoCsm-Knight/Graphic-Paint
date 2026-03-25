import { SceneItem } from "./ShapeTypes";

/**
 * A lightweight scene item that calls clearRect during replay.
 *
 * Used by the freehand selection cut to represent the "hole" left on the canvas
 * without creating a full RasterCheckpoint.  Because this is NOT a checkpoint,
 * redrawFromScene continues to replay all vector shapes that precede it in the
 * scene array, so those shapes remain visible and selectable by the multi-select
 * tool even after a cut has been performed.
 */
export default class ClearRectItem extends SceneItem {
    constructor(
        private readonly x: number,
        private readonly y: number,
        private readonly w: number,
        private readonly h: number,
    ) { super(); }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(this.x, this.y, this.w, this.h);
    }
}
