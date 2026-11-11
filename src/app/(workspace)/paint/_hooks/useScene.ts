import { useCallback, useRef, useState } from "react";
import type { SceneItem } from "../_shapes/ShapeTypes";
import { drawRedoItem, replayScene } from "../_utils/sceneReplay";
import { SceneHistory } from "../_utils/sceneOperations";

export type { SceneItem };

/*
 * Checkpoints: FreeForm and FillShape keep their own ImageData snapshot after
 * draw, so they act as restore points (isCheckpoint() returns true while the
 * snapshot is held). Every other item is replayed from its vector data, which
 * is what gets persisted.
 */

/**
 * Manages the ordered list of drawn items and the operation-based history
 * (see SceneHistory): appending items, editing/deleting existing ones (as a
 * single undoable replace), and transient states while a shape is lifted
 * out for editing.
 *
 * Replay strategy — O(items since last checkpoint):
 *   1. Scan backwards to find the most recent checkpoint (isCheckpoint() === true).
 *   2. putImageData (O(pixels), very fast) to restore that checkpoint.
 *   3. Draw only the items that follow it.
 */
const useScene = () => {
    const historyRef = useRef<SceneHistory | null>(null);
    if (historyRef.current === null) historyRef.current = new SceneHistory();

    /** Always mirrors the history's current scene (read by many hooks). */
    const sceneRef = useRef<SceneItem[]>([]);
    const [sceneRevision, setSceneRevision] = useState(0);

    /** Mirror the scene; committed changes also bump the revision (autosave). */
    const sync = useCallback((committed: boolean) => {
        sceneRef.current = historyRef.current!.scene;
        if (committed) setSceneRevision((revision) => revision + 1);
    }, []);

    /** Replay the scene onto ctx (clears, then draws from the last checkpoint). */
    const redrawFromScene = useCallback((ctx: CanvasRenderingContext2D) => {
        replayScene(sceneRef.current, ctx);
    }, []);

    /** Append an item (one undo step). */
    const pushShape = useCallback((shape: SceneItem) => {
        historyRef.current!.push(shape);
        sync(true);
    }, [sync]);

    /**
     * Commit a new scene as one undo step (edit/delete/group existing items).
     * Pass `before` when the current scene is a transient editing state.
     */
    const commitScene = useCallback((after: SceneItem[], before?: SceneItem[]) => {
        historyRef.current!.replace(after, before);
        sync(true);
    }, [sync]);

    /** Show a scene without recording history (lift for editing / cancel). */
    const setSceneTransient = useCallback((next: SceneItem[]) => {
        historyRef.current!.setTransient(next);
        sync(false);
    }, [sync]);

    /** Undo the last operation and replay; returns whether anything changed. */
    const undoScene = useCallback((ctx: CanvasRenderingContext2D): boolean => {
        const op = historyRef.current!.undo();
        if (!op) return false;
        sync(true);
        redrawFromScene(ctx);
        return true;
    }, [redrawFromScene, sync]);

    /** Redo the last undone operation; returns whether anything changed. */
    const redoScene = useCallback((ctx: CanvasRenderingContext2D): boolean => {
        const op = historyRef.current!.redo();
        if (!op) return false;
        sync(true);
        if (op.type === 'push') {
            // Appended item: draw on top of the current canvas state.
            drawRedoItem(op.item, ctx);
        } else {
            redrawFromScene(ctx);
        }
        return true;
    }, [redrawFromScene, sync]);

    /** Replace everything and clear history (e.g. after loading a project). */
    const resetScene = useCallback((items: SceneItem[]) => {
        historyRef.current!.reset(items);
        sync(true);
    }, [sync]);

    return {
        sceneRef,
        sceneRevision,
        pushShape,
        commitScene,
        setSceneTransient,
        undoScene,
        redoScene,
        resetScene,
        redrawFromScene,
    };
};

export default useScene;
