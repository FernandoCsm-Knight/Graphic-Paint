import { useCallback, useRef } from "react";
import { SceneItem } from "../shapes/ShapeTypes";

export type { SceneItem };

/**
 * Module-private raster checkpoint — a full canvas bitmap stored as ImageData.
 * Used by takeSnapshotShape (selection cuts, explicit saves) as a restore point
 * for redrawFromScene.
 *
 * FreeForm and FillShape self-contain their own ImageData snapshot after draw,
 * so they act as their own checkpoints (isCheckpoint() returns true once drawn).
 */
class RasterCheckpoint extends SceneItem {
    private data: ImageData;
    constructor(data: ImageData) { super(); this.data = data; }
    draw(ctx: CanvasRenderingContext2D): void { ctx.putImageData(this.data, 0, 0); }
    override isCheckpoint(): boolean { return true; }
}

/**
 * Manages the ordered list of drawn items and the redo stack.
 *
 * Replay strategy — O(items since last checkpoint):
 *   1. Scan backwards to find the most recent checkpoint (isCheckpoint() === true).
 *   2. putImageData (O(pixels), very fast) to restore that checkpoint.
 *   3. Draw only the vector shapes that follow it (typically 0–10 items).
 */
const useScene = () => {
    const sceneRef = useRef<SceneItem[]>([]);
    const redoStackRef = useRef<SceneItem[]>([]);

    /**
     * Replay the scene onto ctx, starting from the last checkpoint.
     * Clears the canvas first only if no checkpoint exists in the scene.
     */
    const redrawFromScene = useCallback((ctx: CanvasRenderingContext2D) => {
        const scene = sceneRef.current;

        if (scene.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        let startIdx = 0;
        let found: boolean = false;
        for (let i = scene.length - 1; i >= 0 && !found; i--) {
            found = scene[i].isCheckpoint();
            if (found) startIdx = i;
        }

        if (!found) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        for (let i = startIdx; i < scene.length; i++) {
            scene[i].draw(ctx);
        }
    }, []);

    /**
     * Capture the current canvas state as a RasterCheckpoint.
     * Called for selection cuts and explicit saves.
     */
    const takeSnapshotShape = useCallback((ctx: CanvasRenderingContext2D): SceneItem => {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        return new RasterCheckpoint(imageData);
    }, []);

    /** Add an item to the scene and clear the redo stack. */
    const pushShape = useCallback((shape: SceneItem) => {
        sceneRef.current.push(shape);
        redoStackRef.current = [];
    }, []);

    /**
     * Undo: remove the last item, replay the remaining scene, return whether
     * the scene changed (so the caller can decide whether to re-render).
     */
    const undoScene = useCallback((ctx: CanvasRenderingContext2D): boolean => {
        const response: boolean = sceneRef.current.length !== 0;

        if (response) {
            const removed = sceneRef.current.pop()!;
            redoStackRef.current.push(removed);
            redrawFromScene(ctx);
        }

        return response;
    }, [redrawFromScene]);

    /**
     * Redo: restore the last undone item and draw it on the current canvas.
     * Checkpoints replace the entire bitmap; vector shapes draw on top of the
     * state left by undoScene.
     */
    const redoScene = useCallback((ctx: CanvasRenderingContext2D): boolean => {
        const response: boolean = redoStackRef.current.length !== 0;

        if (response) {
            const shape = redoStackRef.current.pop()!;
            sceneRef.current.push(shape);
            shape.draw(ctx);
        }

        return response;
    }, []);

    /** Discard all drawn items and reset redo stack (e.g. on canvas clear). */
    const clearScene = useCallback(() => {
        sceneRef.current = [];
        redoStackRef.current = [];
    }, []);

    return {
        sceneRef,
        pushShape,
        undoScene,
        redoScene,
        clearScene,
        redrawFromScene,
        takeSnapshotShape,
    };
};

export default useScene;
