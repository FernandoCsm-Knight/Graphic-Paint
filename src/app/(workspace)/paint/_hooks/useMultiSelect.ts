import { useCallback, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { ReplacementContext } from "../_context/ReplacementContext";
import { SettingsContext } from "../_context/SettingsContext";
import { Shape } from "../_shapes/ShapeTypes";
import { getShapeBoundingBoxInDocSpace } from "../_utils/boundingBox";
import ShapeGroup from "../_shapes/ShapeGroup";
import type { SceneItem } from "./useScene";
import type { EnterPendingOptions } from "./usePendingPlacement";
import type { Point } from "@/types/geometry";
import type { BoundingBox } from "../_shapes/ShapeTypes";

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

function rectsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
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
        const sx = Math.min(s.x, e.x);
        const sy = Math.min(s.y, e.y);
        const w  = Math.abs(e.x - s.x);
        const h  = Math.abs(e.y - s.y);
        selectionItemRef.current.update(() => drawSelectionOverlay(sx, sy, w, h));
    }, [selectionItemRef, drawSelectionOverlay]);

    // ── Public API ────────────────────────────────────────────────────────────

    const startMultiSelect = useCallback((point: Point) => {
        selStart.current = point;
        selEnd.current   = point;
        phase.current    = 'drawing';
        selectionItemRef.current.update(() => drawSelectionOverlay(point.x, point.y, 0, 0));
        renderViewport();
    }, [renderViewport, drawSelectionOverlay, selectionItemRef]);

    const updateMultiSelect = useCallback((point: Point) => {
        if (!selStart.current) return;
        selEnd.current = point;
        const sx = Math.min(selStart.current.x, point.x);
        const sy = Math.min(selStart.current.y, point.y);
        const w  = Math.abs(point.x - selStart.current.x);
        const h  = Math.abs(point.y - selStart.current.y);
        selectionItemRef.current.update(() => drawSelectionOverlay(sx, sy, w, h));
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

        const sx = Math.min(selStart.current.x, selEnd.current.x);
        const sy = Math.min(selStart.current.y, selEnd.current.y);
        const sw = Math.abs(selEnd.current.x - selStart.current.x);
        const sh = Math.abs(selEnd.current.y - selStart.current.y);

        phase.current    = 'idle';
        selStart.current = null;
        selEnd.current   = null;
        selectionItemRef.current.update(null);

        if (sw < 2 || sh < 2) {
            renderViewport();
            return;
        }

        const selRect: BoundingBox = { x: sx, y: sy, width: sw, height: sh };

        // Search all Shape instances in the scene. The freehand cut now stores a
        // ClearRectItem (not a checkpoint) so shapes before a cut remain in the
        // scene array and are fully selectable here.
        const scene = sceneRef.current;
        const selected = scene.filter(item => {
            if (!(item instanceof Shape)) return false;
            const bb = getShapeBoundingBoxInDocSpace(item);
            return rectsIntersect(selRect, bb);
        }) as Shape[];

        if (selected.length === 0) {
            renderViewport();
            return;
        }

        // Remove selected shapes from scene and redraw.
        const capturedScene = [...scene];
        replaceScene(scene.filter(item => !selected.includes(item as Shape)));
        redrawFromScene(ctx);

        // If exactly one ShapeGroup was selected, enter pending with it directly
        // so it stays as a group and the user can ungroup via the lock button.
        const isExistingGroup = selected.length === 1 && selected[0] instanceof ShapeGroup;
        const shapeGroup = isExistingGroup
            ? selected[0] as ShapeGroup
            : new ShapeGroup(selected, { pixelated, pixelSize });

        /** Bake group rotation into each child and push individually. */
        const pushUngrouped = (children: Shape[]) => {
            const groupCenter   = shapeGroup.getCenter();
            const groupRotation = shapeGroup.rotation;
            const cos = Math.cos(groupRotation);
            const sin = Math.sin(groupRotation);
            for (const s of children) {
                if (groupRotation !== 0) {
                    const sc   = s.getCenter();
                    const relX = sc.x - groupCenter.x;
                    const relY = sc.y - groupCenter.y;
                    s.moveBy(
                        (relX * cos - relY * sin) - relX,
                        (relX * sin + relY * cos) - relY,
                    );
                    s.rotateTo(s.rotation + groupRotation);
                }
                pushShape(s);
            }
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
