import { useCallback, useRef } from "react";
import { Shape } from "../shapes/ShapeTypes";
import SnapshotShape from "../shapes/SnapshotShape";

/**
 * A scene item is either a lightweight vector shape (geometry + style data),
 * a SnapshotShape (a full raster checkpoint of the canvas bitmap),
 * or an ImageShape (a placed image with position and dimensions).
 *
 * Vector shapes are cheap to store (~100 bytes) and cheap to replay.
 * SnapshotShapes are expensive to store (~15 MB) but instantaneous to restore
 * via putImageData — used for freeform strokes and fill operations.
 * ImageShapes now extend Shape, so pasted images can reuse the same pending
 * placement, movement, and rotation flow as vector items.
 */
export type SceneItem = Shape | SnapshotShape;

/**
 * Manages the ordered list of drawn items and the redo stack.
 *
 * Replay strategy — O(items since last snapshot):
 *   1. Scan backwards to find the most recent SnapshotShape checkpoint.
 *   2. putImageData (O(pixels), very fast) to restore that checkpoint.
 *   3. Draw only the vector shapes that follow it (typically 0–10 items).
 *
 * This makes undo of a vector shape nearly instantaneous even with a large
 * canvas, because we never replay freeform points or flood-fill algorithms.
 */
const useScene = () => {
    const sceneRef = useRef<SceneItem[]>([]);
    const redoStackRef = useRef<SceneItem[]>([]);

    /**
     * Replay the scene onto ctx, starting from the last SnapshotShape.
     * Clears the canvas first only if no snapshot exists in the scene.
     */
    const redrawFromScene = useCallback((ctx: CanvasRenderingContext2D) => {
        const scene = sceneRef.current;

        if (scene.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        // Find the last snapshot — it is the most recent full-canvas checkpoint
        let startIdx = 0;
        let found: boolean = false;
        for (let i = scene.length - 1; i >= 0 && !found; i--) {
            found = scene[i] instanceof SnapshotShape;
            if (found) startIdx = i;
        }

        // Clear only when no snapshot is present (all items are vectors)
        if (!found) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        for (let i = startIdx; i < scene.length; i++) {
            scene[i].draw(ctx);
        }
    }, []);

    /**
     * Capture the current canvas state as a SnapshotShape checkpoint.
     * Called after freeform strokes, fill operations, and eraser strokes.
     */
    const takeSnapshotShape = useCallback((ctx: CanvasRenderingContext2D): SnapshotShape => {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        return new SnapshotShape(imageData);
    }, []);

    /** Add a shape or snapshot to the scene and clear the redo stack. */
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
     * Drawing on top works because:
     *   - SnapshotShape.draw() replaces the entire bitmap (always correct).
     *   - Vector shapes draw on top of the state left by undoScene (correct
     *     because undoScene replays the scene, leaving the canvas at the right
     *     state for the next shape).
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
