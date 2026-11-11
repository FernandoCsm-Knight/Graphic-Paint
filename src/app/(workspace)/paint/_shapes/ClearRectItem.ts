import { SceneItem } from "./ShapeTypes";

/**
 * A lightweight scene item that calls clearRect during replay.
 *
 * Used by the selection cut (the "hole" left on the canvas) and by the
 * page-size eraser, without storing a full-canvas bitmap.  Because this is NOT a checkpoint,
 * redrawFromScene continues to replay all vector shapes that precede it in the
 * scene array, so those shapes remain visible and selectable by the multi-select
 * tool even after a cut has been performed.
 */
export default class ClearRectItem extends SceneItem {
    constructor(
        readonly x: number,
        readonly y: number,
        readonly w: number,
        readonly h: number,
    ) { super(); }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(this.x, this.y, this.w, this.h);
    }
}
