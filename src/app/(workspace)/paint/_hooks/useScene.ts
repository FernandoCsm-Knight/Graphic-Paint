import { useCallback, useRef, useState } from "react";
import type { SceneItem } from "../_shapes/ShapeTypes";
import { drawRedoItem, replayScene } from "../_utils/sceneReplay";
import {
    applyCheckpointInterval,
    computeUndoFloor,
    releaseSnapshotsBeforeFloor,
} from "../_utils/sceneHistory";

export type { SceneItem };

/*
 * Checkpoints: FreeForm and FillShape keep their own ImageData snapshot after
 * draw, so they act as restore points (isCheckpoint() returns true while the
 * snapshot is held). Every other item is replayed from its vector data, which
 * is what gets persisted.
 */

/**
 * Manages the ordered list of drawn items and the redo stack.
 *
 * Replay strategy — O(items since last checkpoint):
 *   1. Scan backwards to find the most recent checkpoint (isCheckpoint() === true).
 *   2. putImageData (O(pixels), very fast) to restore that checkpoint.
 *   3. Draw only the vector shapes that follow it (typically 0–10 items).
 *
 * Memory: raster snapshots (~4 bytes per canvas pixel each) are kept at most
 * every CHECKPOINT_INTERVAL items, undo is limited to MAX_UNDO_STEPS, and
 * snapshots older than the undo floor's base checkpoint are released.
 */
const useScene = () => {
    const sceneRef = useRef<SceneItem[]>([]);
    const redoStackRef = useRef<SceneItem[]>([]);
    /** Undo cannot shrink the scene below this length. */
    const undoFloorRef = useRef(0);
    const [sceneRevision, setSceneRevision] = useState(0);

    const bumpSceneRevision = useCallback(() => {
        setSceneRevision((revision) => revision + 1);
    }, []);

    /** Replay the scene onto ctx (clears, then draws from the last checkpoint). */
    const redrawFromScene = useCallback((ctx: CanvasRenderingContext2D) => {
        replayScene(sceneRef.current, ctx);
    }, []);

    /** Add an item to the scene and clear the redo stack. */
    const pushShape = useCallback((shape: SceneItem) => {
        const scene = sceneRef.current;
        scene.push(shape);
        redoStackRef.current = [];

        applyCheckpointInterval(scene);
        const floor = computeUndoFloor(undoFloorRef.current, scene.length);
        if (floor !== undoFloorRef.current) {
            undoFloorRef.current = floor;
            releaseSnapshotsBeforeFloor(scene, floor);
        }

        bumpSceneRevision();
    }, [bumpSceneRevision]);

    /**
     * Undo: remove the last item, replay the remaining scene, return whether
     * the scene changed (so the caller can decide whether to re-render).
     */
    const undoScene = useCallback((ctx: CanvasRenderingContext2D): boolean => {
        const response: boolean = sceneRef.current.length > undoFloorRef.current;

        if (response) {
            const removed = sceneRef.current.pop()!;
            redoStackRef.current.push(removed);
            redrawFromScene(ctx);
            bumpSceneRevision();
        }

        return response;
    }, [bumpSceneRevision, redrawFromScene]);

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
            drawRedoItem(shape, ctx);
            bumpSceneRevision();
        }

        return response;
    }, [bumpSceneRevision]);

    /** Discard all drawn items and reset redo stack (e.g. on canvas clear). */
    const clearScene = useCallback(() => {
        sceneRef.current = [];
        redoStackRef.current = [];
        undoFloorRef.current = 0;
        bumpSceneRevision();
    }, [bumpSceneRevision]);

    const replaceScene = useCallback((nextScene: SceneItem[]) => {
        sceneRef.current = nextScene;
        redoStackRef.current = [];
        undoFloorRef.current = Math.min(undoFloorRef.current, nextScene.length);
        bumpSceneRevision();
    }, [bumpSceneRevision]);

    return {
        sceneRef,
        sceneRevision,
        pushShape,
        undoScene,
        redoScene,
        clearScene,
        replaceScene,
        redrawFromScene,
    };
};

export default useScene;
