import { useCallback, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { ReplacementContext } from "../_context/ReplacementContext";
import { SettingsContext } from "../_context/SettingsContext";
import type { Shape } from "../_shapes/ShapeTypes";
import {
    getInclusivePixelBoundingBox,
} from "../_utils/boundingBox";
import {
    clipSceneItemsToPixelBounds,
    createPixelBoundsFromDocPoints,
} from "../_utils/pixelClipping";
import type { SceneItem } from "./useScene";
import type { EnterPendingOptions } from "./usePendingPlacement";
import type { Point } from "@/types/geometry";
import ImageShape from "../_shapes/ImageShape";
import ShapeGroup from "../_shapes/ShapeGroup";
import ClearRectItem from "../_shapes/ClearRectItem";

// ─── Types ───────────────────────────────────────────────────────────────────

type SelectionInput = {
    sceneRef: RefObject<SceneItem[]>;
    pushShape: (shape: SceneItem) => void;
    replaceScene: (scene: SceneItem[]) => void;
    enterPendingShape: (shape: Shape, options?: EnterPendingOptions) => void;
};

type SelectionPhase = 'idle' | 'drawing';

// ─── Overlay drawing helpers ──────────────────────────────────────────────────

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
    overlay.strokeStyle = '#1d4ed8';
    overlay.fillStyle = 'rgba(59,130,246,0.10)';
    overlay.beginPath();
    overlay.rect(x, y, w, h);
    overlay.fill();
    overlay.stroke();
    overlay.setLineDash([]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useSelection = ({
    sceneRef,
    pushShape,
    replaceScene,
    enterPendingShape,
}: SelectionInput) => {
    const { contextRef, pixelated, renderViewport, selectionItemRef } = useContext(PaintContext)!;
    const { viewOffset, zoom } = useWorkspaceContext();
    const { pixelSize, clipAlgorithm } = useContext(SettingsContext)!;
    const { replacementContextRef } = useContext(ReplacementContext)!;

    const phase    = useRef<SelectionPhase>('idle');
    const selStart = useRef<Point | null>(null);
    const selEnd   = useRef<Point | null>(null);

    // ── Snap helper ────────────────────────────────────────────────────────────

    const snap = useCallback((v: number) =>
        pixelated ? Math.floor(v / pixelSize) * pixelSize : v,
    [pixelated, pixelSize]);

    // ── Overlay: draw selection border ─────────────────────────────────────────

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

        if (pixelated) {
            const bounds = createPixelBoundsFromDocPoints(s, e, pixelSize);
            const rect = getInclusivePixelBoundingBox(bounds, pixelSize);
            selectionItemRef.current.update(() => drawSelectionOverlay(rect.x, rect.y, rect.width, rect.height));
        } else {
            const sx = Math.min(s.x, e.x);
            const sy = Math.min(s.y, e.y);
            const w  = Math.abs(e.x - s.x);
            const h  = Math.abs(e.y - s.y);
            selectionItemRef.current.update(() => drawSelectionOverlay(sx, sy, w, h));
        }
    }, [selectionItemRef, pixelated, pixelSize, drawSelectionOverlay]);

    // ── Public drawing phase API ───────────────────────────────────────────────

    const startSelection = useCallback((point: Point) => {
        const p = { x: snap(point.x), y: snap(point.y) };
        selStart.current = p;
        selEnd.current   = p;
        phase.current    = 'drawing';

        if (pixelated) {
            const bounds = createPixelBoundsFromDocPoints(p, p, pixelSize);
            const rect = getInclusivePixelBoundingBox(bounds, pixelSize);
            selectionItemRef.current.update(() => drawSelectionOverlay(rect.x, rect.y, rect.width, rect.height));
        } else {
            selectionItemRef.current.update(() => drawSelectionOverlay(p.x, p.y, 0, 0));
        }
        renderViewport();
    }, [snap, renderViewport, drawSelectionOverlay, pixelated, pixelSize, selectionItemRef]);

    const updateSelection = useCallback((point: Point) => {
        if (!selStart.current) return;
        const nx = snap(point.x);
        const ny = snap(point.y);
        selEnd.current = { x: nx, y: ny };

        if (pixelated) {
            const bounds = createPixelBoundsFromDocPoints(selStart.current, selEnd.current, pixelSize);
            const rect = getInclusivePixelBoundingBox(bounds, pixelSize);
            selectionItemRef.current.update(() => drawSelectionOverlay(rect.x, rect.y, rect.width, rect.height));
        } else {
            const sx = Math.min(selStart.current.x, nx);
            const sy = Math.min(selStart.current.y, ny);
            const w  = Math.abs(nx - selStart.current.x);
            const h  = Math.abs(ny - selStart.current.y);
            selectionItemRef.current.update(() => drawSelectionOverlay(sx, sy, w, h));
        }
        renderViewport();
    }, [snap, renderViewport, drawSelectionOverlay, pixelated, pixelSize, selectionItemRef]);

    const stopSelection = useCallback(() => {
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

        const startPoint = selStart.current;
        const endPoint   = selEnd.current;

        // Clear the dashed-rect overlay — pending placement will show its own handles.
        phase.current    = 'idle';
        selStart.current = null;
        selEnd.current   = null;
        selectionItemRef.current.update(null);

        if (pixelated) {
            const selectionBounds = createPixelBoundsFromDocPoints(startPoint, endPoint, pixelSize);
            if (selectionBounds.width === 0 && selectionBounds.height === 0) {
                renderViewport();
                return;
            }

            const { floatingShapes, floatingBounds } = clipSceneItemsToPixelBounds({
                scene: sceneRef.current,
                clipAlgorithm,
                bounds: selectionBounds,
            });

            if (floatingShapes.length === 0 || !floatingBounds) {
                renderViewport();
                return;
            }

            // Wrap the clipped vector shapes in a ShapeGroup so pending placement
            // can move/rotate them together. The group uses grid-unit coordinates
            // (pixelated: true) to match the pending placement coordinate system.
            const shapeGroup = new ShapeGroup(floatingShapes, { pixelated: true, pixelSize });

            // On confirm, bake the group rotation into each individual shape and
            // push them back to the scene as independent vector shapes so they
            // can be re-selected and re-clipped in future operations.
            enterPendingShape(shapeGroup, {
                onConfirm: () => {
                    const groupCenter  = shapeGroup.getCenter();
                    const groupRotation = shapeGroup.rotation;
                    const cos = Math.cos(groupRotation);
                    const sin = Math.sin(groupRotation);
                    for (const s of floatingShapes) {
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
                },
            });
        } else {
            const sx = Math.min(startPoint.x, endPoint.x);
            const sy = Math.min(startPoint.y, endPoint.y);
            const sw = Math.abs(endPoint.x - startPoint.x);
            const sh = Math.abs(endPoint.y - startPoint.y);

            if (sw < 2 || sh < 2) {
                renderViewport();
                return;
            }

            const imageData = ctx.getImageData(sx, sy, sw, sh);
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width  = sw;
            tmpCanvas.height = sh;
            tmpCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

            const imageShape = new ImageShape(tmpCanvas, sx, sy, sw, sh);

            // Capture scene before modifying it (needed to undo the hole on cancel).
            const capturedScene = [...sceneRef.current];
            ctx.clearRect(sx, sy, sw, sh);
            // Push a ClearRectItem instead of a full RasterCheckpoint so that
            // all vector shapes before the cut remain in the scene and stay
            // selectable by the multi-select tool.
            pushShape(new ClearRectItem(sx, sy, sw, sh));

            enterPendingShape(imageShape, {
                onCancel: () => {
                    // Restore pre-hole scene so redrawFromScene shows the original painting.
                    replaceScene(capturedScene);
                },
            });
        }
    }, [
        contextRef, sceneRef, pixelated, pixelSize, clipAlgorithm,
        renderViewport, selectionItemRef, pushShape, enterPendingShape,
        replaceScene,
    ]);

    return {
        startSelection,
        updateSelection,
        stopSelection,
    };
};

export default useSelection;
