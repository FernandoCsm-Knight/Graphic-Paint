import { useCallback, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { ReplacementContext } from "../_context/ReplacementContext";
import { SettingsContext } from "../_context/SettingsContext";
import { Shape } from "../_shapes/ShapeTypes";
import {
    getShapeDocBoundingBox,
    normalizeBoundingBox,
    rectsIntersect,
} from "../_utils/boundingBox";
import ShapeGroup from "../_shapes/ShapeGroup";
import type { SceneItem } from "./useScene";
import type { EnterPendingOptions } from "./usePendingPlacement";
import type { Point } from "@/types/geometry";

// ─── Types ────────────────────────────────────────────────────────────────────

type MultiSelectInput = {
    sceneRef: RefObject<SceneItem[]>;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    pushShape: (shape: SceneItem) => void;
    replaceScene: (scene: SceneItem[]) => void;
    enterPendingShape: (shape: Shape, options?: EnterPendingOptions) => void;
};

type SelectionPhase = 'idle' | 'drawing';

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
    pushShape,
    replaceScene,
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

        // Search all Shape instances in the scene. The freehand cut now stores a
        // ClearRectItem (not a checkpoint) so shapes before a cut remain in the
        // scene array and are fully selectable here.
        const scene = sceneRef.current;
        const selected = scene.filter(item => {
            if (!(item instanceof Shape)) return false;
            if (item.pixelated !== pixelated) return false;
            const bb = getShapeDocBoundingBox(item);
            return rectsIntersect(selectionBounds, bb);
        }) as Shape[];

        if (selected.length === 0) {
            renderViewport();
            return;
        }

        // Remove selected shapes from scene and redraw.
        const capturedScene = [...scene];
        replaceScene(scene.filter(item => !selected.includes(item as Shape)));
        redrawFromScene(ctx);

        if (selected.length === 1 && !(selected[0] instanceof ShapeGroup)) {
            const shape = selected[0];
            enterPendingShape(shape, {
                onCancel: () => {
                    replaceScene(capturedScene);
                },
            });
            return;
        }

        // If exactly one ShapeGroup was selected, enter pending with it directly
        // so it stays as a group and the user can ungroup via the lock button.
        const isExistingGroup = selected.length === 1 && selected[0] instanceof ShapeGroup;
        const shapeGroup = isExistingGroup
            ? selected[0] as ShapeGroup
            : new ShapeGroup(selected, { pixelated, pixelSize });

        /** Push children individually. Rotation is already baked into each shape by rotateBy(). */
        const pushUngrouped = (children: Shape[]) => {
            for (const s of children) pushShape(s);
        };

        enterPendingShape(shapeGroup, {
            onCancel: () => {
                replaceScene(capturedScene);
            },
            onConfirm: () => {
                if (isExistingGroup) {
                    // Existing group: push it back as a group.
                    pushShape(shapeGroup);
                } else {
                    // New selection: push children individually (default behaviour).
                    pushUngrouped(selected);
                }
            },
            onLock: () => {
                if (isExistingGroup) {
                    // Ungroup: push children individually with baked rotation.
                    pushUngrouped(shapeGroup.shapes);
                } else {
                    // Group: push the ShapeGroup as a single scene item.
                    pushShape(shapeGroup);
                }
            },
            isGroupLocked: isExistingGroup,
        });
    }, [
        contextRef, sceneRef, pixelated, pixelSize,
        renderViewport, selectionItemRef, redrawFromScene,
        pushShape, replaceScene, enterPendingShape,
    ]);

    return { startMultiSelect, updateMultiSelect, stopMultiSelect };
};

export default useMultiSelect;
