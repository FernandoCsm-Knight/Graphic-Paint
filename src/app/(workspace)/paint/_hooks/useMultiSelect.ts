import { useCallback, useContext, useEffect, useRef } from "react";
import { getEditableShapes } from "../_utils/erasure";
import type { RefObject } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { ReplacementContext } from "../_context/ReplacementContext";
import { SettingsContext } from "../_context/SettingsContext";
import { Shape } from "../_shapes/ShapeTypes";
import { normalizeBoundingBox } from "../_utils/boundingBox";
import { findTopmostHit, shapeIntersectsRect } from "../_utils/hitTest";
import ShapeGroup from "../_shapes/ShapeGroup";
import { liftFromScene } from "../_utils/pendingActions";
import { cloneSceneItem } from "../_utils/cloneSceneItem";
import { replaceItemsInPlace } from "../_utils/sceneOperations";
import type { SceneItem } from "./useScene";
import type { EnterPendingOptions } from "./usePendingPlacement";
import type { Point } from "@/types/geometry";

// ─── Types ────────────────────────────────────────────────────────────────────

type MultiSelectInput = {
    sceneRef: RefObject<SceneItem[]>;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    commitScene: (after: SceneItem[], before?: SceneItem[]) => void;
    setSceneTransient: (scene: SceneItem[]) => void;
    enterPendingShape: (shape: Shape, options?: EnterPendingOptions) => void;
};

type SelectionPhase = 'idle' | 'drawing';

/** Click tolerance around a stroke, in screen pixels. */
const CLICK_TOLERANCE_PX = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyViewportTransform(
    overlay: CanvasRenderingContext2D,
    zoom: number,
    viewOffset: Point,
): void {
    const dpr = window.devicePixelRatio || 1;
    overlay.setTransform(zoom * dpr, 0, 0, zoom * dpr, viewOffset.x * dpr, viewOffset.y * dpr);
}

function drawDashedRect(
    overlay: CanvasRenderingContext2D,
    zoom: number,
    x: number, y: number, w: number, h: number,
): void {
    const lw = 1 / zoom;
    overlay.setLineDash([4 * lw, 4 * lw]);
    overlay.lineWidth = lw;
    overlay.strokeStyle = '#7c3aed';
    overlay.fillStyle = 'rgba(139,92,246,0.10)';
    overlay.beginPath();
    overlay.rect(x, y, w, h);
    overlay.fill();
    overlay.stroke();
    overlay.setLineDash([]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useMultiSelect = ({
    sceneRef,
    redrawFromScene,
    commitScene,
    setSceneTransient,
    enterPendingShape,
}: MultiSelectInput) => {
    const { contextRef, renderViewport, selectionItemRef } = useContext(PaintContext)!;
    const { viewOffset, zoom } = useWorkspaceContext();
    const { pixelSize } = useContext(SettingsContext)!;
    const { replacementContextRef } = useContext(ReplacementContext)!;
    const { pixelated } = useContext(PaintContext)!;

    const phase    = useRef<SelectionPhase>('idle');
    const selStart = useRef<Point | null>(null);
    const selEnd   = useRef<Point | null>(null);

    // ── Overlay ───────────────────────────────────────────────────────────────

    const drawSelectionOverlay = useCallback((
        x: number, y: number, w: number, h: number,
    ) => {
        const overlay = replacementContextRef.current;
        if (!overlay) return;
        overlay.save();
        applyViewportTransform(overlay, zoom, viewOffset);
        drawDashedRect(overlay, zoom, x, y, w, h);
        overlay.restore();
    }, [replacementContextRef, zoom, viewOffset]);

    // ── Keep overlay in sync when zoom/viewOffset change ──────────────────────

    useEffect(() => {
        if (phase.current !== 'drawing') return;
        const s = selStart.current;
        const e = selEnd.current;
        if (!s || !e) return;
        const bounds = normalizeBoundingBox(s, e);
        selectionItemRef.current.update(() => drawSelectionOverlay(bounds.x, bounds.y, bounds.width, bounds.height));
    }, [selectionItemRef, drawSelectionOverlay]);

    // ── Public API ────────────────────────────────────────────────────────────

    const startMultiSelect = useCallback((point: Point) => {
        selStart.current = point;
        selEnd.current   = point;
        phase.current    = 'drawing';
        const bounds = normalizeBoundingBox(point, point);
        selectionItemRef.current.update(() => drawSelectionOverlay(bounds.x, bounds.y, bounds.width, bounds.height));
        renderViewport();
    }, [renderViewport, drawSelectionOverlay, selectionItemRef]);

    const updateMultiSelect = useCallback((point: Point) => {
        if (!selStart.current) return;
        selEnd.current = point;
        const bounds = normalizeBoundingBox(selStart.current, point);
        selectionItemRef.current.update(() => drawSelectionOverlay(bounds.x, bounds.y, bounds.width, bounds.height));
        renderViewport();
    }, [renderViewport, drawSelectionOverlay, selectionItemRef]);

    /** Lifts `selected` out of the scene and enters pending edit mode on copies. */
    const beginEditing = useCallback((selected: Shape[], ctx: CanvasRenderingContext2D) => {
        const scene = sceneRef.current;
        // Lift the selected shapes out of the scene (transient, no history)
        // and edit COPIES, so the originals stay intact for cancel/undo.
        // Confirm/delete commit one undoable change that replaces the
        // originals in place (drawing order is preserved).
        const { remaining, original } = liftFromScene<SceneItem>(scene, selected);
        setSceneTransient(remaining);
        redrawFromScene(ctx);

        const commitReplacing = (mapping: Map<SceneItem, SceneItem[]>) => {
            commitScene(replaceItemsInPlace(original, mapping), original);
        };
        const deleteSelected = () => {
            commitReplacing(new Map(selected.map((item): [SceneItem, SceneItem[]] => [item, []])));
        };
        const restore = () => setSceneTransient(original);

        if (selected.length === 1 && !(selected[0] instanceof ShapeGroup)) {
            const target = selected[0];
            const copy = cloneSceneItem(target);
            enterPendingShape(copy, {
                onCancel: restore,
                onDelete: deleteSelected,
                onConfirm: () => commitReplacing(new Map([[target, [copy]]])),
            });
            return;
        }

        // If exactly one ShapeGroup was selected, enter pending with it directly
        // so it stays as a group and the user can ungroup via the lock button.
        const isExistingGroup = selected.length === 1 && selected[0] instanceof ShapeGroup;
        const copies = selected.map((item) => cloneSceneItem(item));
        const shapeGroup = isExistingGroup
            ? copies[0] as ShapeGroup
            : new ShapeGroup(copies, { pixelated, pixelSize });

        enterPendingShape(shapeGroup, {
            onCancel: restore,
            onDelete: deleteSelected,
            onConfirm: () => {
                // Existing group stays a group; a new selection goes back as
                // individual shapes, each in its original position.
                commitReplacing(new Map(selected.map((item, i): [SceneItem, SceneItem[]] => [item, [copies[i]]])));
            },
            onLock: () => {
                if (isExistingGroup) {
                    // Ungroup: the group is replaced by its (edited) children.
                    commitReplacing(new Map([[selected[0], [...shapeGroup.shapes]]]));
                } else {
                    // Group: the first selected shape's slot gets the group.
                    commitReplacing(new Map(selected.map((item, i): [SceneItem, SceneItem[]] => [item, i === 0 ? [shapeGroup] : []])));
                }
            },
            isGroupLocked: isExistingGroup,
        });
    }, [sceneRef, pixelated, pixelSize, redrawFromScene, commitScene, setSceneTransient, enterPendingShape]);

    const stopMultiSelect = useCallback(() => {
        const ctx = contextRef.current;

        const abort = () => {
            phase.current    = 'idle';
            selStart.current = null;
            selEnd.current   = null;
            selectionItemRef.current.update(null);
            renderViewport();
        };

        if (!ctx || !selStart.current || !selEnd.current) {
            abort();
            return;
        }

        const selectionBounds = normalizeBoundingBox(selStart.current, selEnd.current);

        phase.current    = 'idle';
        selStart.current = null;
        selEnd.current   = null;
        selectionItemRef.current.update(null);

        if (selectionBounds.width < 2 || selectionBounds.height < 2) {
            renderViewport();
            return;
        }

        // Only shapes that are still editable vectors (not under a fill, not
        // touched by the eraser / page eraser / a cut), and only when the
        // rectangle touches what is actually drawn.
        const selected = getEditableShapes(sceneRef.current).filter(
            (item) => item.pixelated === pixelated && shapeIntersectsRect(item, selectionBounds),
        );

        if (selected.length === 0) {
            renderViewport();
            return;
        }

        beginEditing(selected, ctx);
    }, [contextRef, sceneRef, pixelated, renderViewport, selectionItemRef, beginEditing]);

    /**
     * Click selection: picks the topmost shape whose drawn outline is under
     * `point` (document pixels) and starts editing it. Returns true if a
     * shape was selected.
     */
    const selectAt = useCallback((point: Point): boolean => {
        const ctx = contextRef.current;
        if (!ctx) return false;
        const tolerance = CLICK_TOLERANCE_PX / zoom;
        const hit = findTopmostHit(
            getEditableShapes(sceneRef.current),
            point,
            tolerance,
            (shape) => shape.pixelated === pixelated,
        );
        if (!hit) return false;
        beginEditing([hit], ctx);
        return true;
    }, [beginEditing, contextRef, pixelated, sceneRef, zoom]);

    return { startMultiSelect, updateMultiSelect, stopMultiSelect, selectAt };
};

export default useMultiSelect;
