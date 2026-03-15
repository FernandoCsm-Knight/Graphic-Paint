import { useCallback, useContext, useRef } from "react";
import { PaintContext } from "../context/PaintContext";
import { ReplacementContext } from "../context/ReplacementContext";
import { Shape } from "../shapes/ShapeTypes";
import type { BoundingBox } from "../shapes/ShapeTypes";
import { getShapeBoundingBoxInDocSpace } from "../utils/boundingBox";
import type { SceneItem } from "./useScene";
import type { Point } from "../../../functions/geometry";
import {
    resolveThemeCssVar,
    THEME_ACCENT_CSS_VAR,
    THEME_SURFACE_CSS_VAR,
} from "../../../utils/workspaceGrid";

/** Screen-space radius of the rotation handle circle (px). */
const ROTATION_HANDLE_RADIUS_PX = 8;
/** Screen-space distance from bbox top-center to rotation handle center (px). */
const ROTATION_HANDLE_DIST_PX = 30;

type PendingMode = 'move' | 'rotate' | null;

type PendingPlacementInput = {
    renderViewport: () => void;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    pushShape: (shape: SceneItem) => void;
};

/** Returns the world-space position of the rotation handle for a given shape. */
const getRotationHandleWorld = (
    bb: BoundingBox,
    rotation: number,
    cx: number,
    cy: number,
    handleDistDoc: number,
): Point => {
    const localY = -(bb.height / 2 + handleDistDoc);
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    // Rotate local (0, localY) around origin, then offset by center
    return { x: cx - localY * sin, y: cy + localY * cos };
};

/** Returns true if doc-space point p is inside the rotated bounding box. */
const isInsideRotatedBBox = (
    p: Point,
    bb: BoundingBox,
    rotation: number,
    cx: number,
    cy: number,
): boolean => {
    const cos = Math.cos(-rotation), sin = Math.sin(-rotation);
    const dx = p.x - cx, dy = p.y - cy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return lx >= -bb.width / 2 && lx <= bb.width / 2 && ly >= -bb.height / 2 && ly <= bb.height / 2;
};

/**
 * Manages the "pending placement" state after a shape is drawn but before it
 * is committed to the scene.
 *
 * While a shape is pending the user can:
 *  - Drag inside the bounding box   → translate (moveBy)
 *  - Drag the rotation handle       → rotate (rotateTo)
 *  - Click outside the bounding box → commit the shape (pushShape)
 *
 * The bounding box + rotation handle are drawn on the overlay canvas (which
 * sits on top of the viewport canvas). renderViewport() clears the overlay,
 * so drawBoundingBoxOverlay() must always be called AFTER renderViewport().
 */
const usePendingPlacement = ({ renderViewport, redrawFromScene, pushShape }: PendingPlacementInput) => {
    const { contextRef, viewOffset, zoom } = useContext(PaintContext)!;
    const { replacementContextRef } = useContext(ReplacementContext)!;

    const pendingShapeRef = useRef<Shape | null>(null);
    const pendingMode = useRef<PendingMode>(null);
    const dragStart = useRef<Point | null>(null);

    /** Resets all mutable drag/pending refs to their idle state. */
    const resetPendingState = () => {
        pendingShapeRef.current = null;
        pendingMode.current = null;
        dragStart.current = null;
    };

    const drawBoundingBoxOverlay = useCallback((shape: Shape) => {
        const overlay = replacementContextRef.current;
        if (!overlay) return;

        const dpr = window.devicePixelRatio || 1;
        const scale = zoom * dpr;
        const lw = 1 / scale;                            // 1 screen px in doc-space units
        const handleDistDoc = ROTATION_HANDLE_DIST_PX / scale;
        const handleRadiusDoc = ROTATION_HANDLE_RADIUS_PX / scale;
        const cornerSize = 6 / scale;
        const overlayAccent = resolveThemeCssVar(THEME_ACCENT_CSS_VAR, "#1d4ed8");
        const overlaySurface = resolveThemeCssVar(THEME_SURFACE_CSS_VAR, "#ffffff");

        // Pixelated shapes store coordinates in grid-units; convert to canvas pixels.
        const bb = getShapeBoundingBoxInDocSpace(shape);
        const cx = bb.x + bb.width  / 2;
        const cy = bb.y + bb.height / 2;
        const hw = bb.width / 2, hh = bb.height / 2;

        overlay.save();
        // Map doc-space → physical pixels, then apply shape rotation around its center
        overlay.setTransform(scale, 0, 0, scale, viewOffset.x * dpr, viewOffset.y * dpr);
        overlay.translate(cx, cy);
        overlay.rotate(shape.rotation);
        overlay.translate(-cx, -cy);

        // Dashed bounding box
        overlay.setLineDash([4 * lw, 4 * lw]);
        overlay.lineWidth = lw;
        overlay.strokeStyle = overlayAccent;
        overlay.strokeRect(cx - hw, cy - hh, bb.width, bb.height);

        // Corner handles
        overlay.setLineDash([]);
        overlay.fillStyle = overlaySurface;
        overlay.strokeStyle = overlayAccent;
        overlay.lineWidth = lw;
        for (const [hx, hy] of [
            [cx - hw, cy - hh], [cx + hw, cy - hh],
            [cx + hw, cy + hh], [cx - hw, cy + hh],
        ] as [number, number][]) {
            overlay.fillRect(hx - cornerSize / 2, hy - cornerSize / 2, cornerSize, cornerSize);
            overlay.strokeRect(hx - cornerSize / 2, hy - cornerSize / 2, cornerSize, cornerSize);
        }

        // Rotation handle stem
        overlay.beginPath();
        overlay.moveTo(cx, cy - hh);
        overlay.lineTo(cx, cy - hh - handleDistDoc);
        overlay.stroke();

        // Rotation handle circle
        overlay.beginPath();
        overlay.arc(cx, cy - hh - handleDistDoc, handleRadiusDoc, 0, Math.PI * 2);
        overlay.fillStyle = overlaySurface;
        overlay.fill();
        overlay.strokeStyle = overlayAccent;
        overlay.stroke();

        overlay.restore();
    }, [replacementContextRef, zoom, viewOffset]);

    /** Enter pending mode: store the shape and draw its bounding box overlay. */
    const enterPending = useCallback((shape: Shape) => {
        resetPendingState();
        pendingShapeRef.current = shape;
        renderViewport();
        drawBoundingBoxOverlay(shape);
    }, [renderViewport, drawBoundingBoxOverlay]);

    /** Commit the pending shape to the scene and clear the overlay. */
    const confirmPending = useCallback(() => {
        const shape = pendingShapeRef.current;
        if (!shape) return;
        resetPendingState();
        pushShape(shape);
        renderViewport();
    }, [pushShape, renderViewport]);

    /** Discard the pending shape and restore the canvas to the committed scene. */
    const cancelPending = useCallback(() => {
        const ctx = contextRef.current;
        resetPendingState();
        if (ctx) {
            redrawFromScene(ctx);
            renderViewport();
        }
    }, [contextRef, redrawFromScene, renderViewport]);

    /**
     * Handle a pointer-down event while a shape is pending.
     * Returns true if the event was consumed (caller should not start new drawing).
     */
    const onPointerDown = useCallback((docPoint: Point): boolean => {
        const shape = pendingShapeRef.current;
        if (!shape) return false;

        const dpr = window.devicePixelRatio || 1;
        const rawBB = shape.getBoundingBox();
        const pixelScale = shape.pixelated ? shape.pixelSize : 1;
        const bb = getShapeBoundingBoxInDocSpace(shape);
        const cx = bb.x + bb.width  / 2;
        const cy = bb.y + bb.height / 2;
        // handleDistDoc in canvas-pixel (doc) space
        const handleDistDoc = ROTATION_HANDLE_DIST_PX / (zoom * dpr);

        // Convert canvas-pixel (doc-space) coords → screen pixels.
        // docPoint arrives in grid units when pixelated, so multiply by pixelScale first.
        const toScreen = (p: Point) => ({
            x: (p.x * pixelScale * zoom + viewOffset.x) * dpr,
            y: (p.y * pixelScale * zoom + viewOffset.y) * dpr,
        });

        const handleWorld = getRotationHandleWorld(bb, shape.rotation, cx, cy, handleDistDoc);
        const sp = toScreen(docPoint);
        const sh = toScreen(handleWorld);
        const distToHandle = Math.hypot(sp.x - sh.x, sp.y - sh.y);

        if (distToHandle <= ROTATION_HANDLE_RADIUS_PX + 4) {
            pendingMode.current = 'rotate';
            dragStart.current = docPoint;
            return true;
        }

        // isInsideRotatedBBox works in grid units (same space as docPoint)
        const gridCx = rawBB.x + rawBB.width  / 2;
        const gridCy = rawBB.y + rawBB.height / 2;
        if (isInsideRotatedBBox(docPoint, rawBB, shape.rotation, gridCx, gridCy)) {
            pendingMode.current = 'move';
            dragStart.current = docPoint;
            return true;
        }

        // Clicked outside: commit shape
        confirmPending();
        return true;
    }, [zoom, viewOffset, confirmPending]);

    /**
     * Handle pointer-move while in pending mode.
     * Returns true if handled (caller should skip normal drawing logic).
     */
    const onPointerMove = useCallback((docPoint: Point): boolean => {
        const shape = pendingShapeRef.current;
        if (!shape || pendingMode.current === null || !dragStart.current) return false;

        const ctx = contextRef.current;
        if (!ctx) return false;

        if (pendingMode.current === 'move') {
            shape.moveBy(docPoint.x - dragStart.current.x, docPoint.y - dragStart.current.y);
            dragStart.current = docPoint;
        } else if (pendingMode.current === 'rotate') {
            const { x: cx, y: cy } = shape.getCenter();
            // atan2 gives angle from center to pointer; +π/2 aligns "up" with 0°
            shape.rotateTo(Math.atan2(docPoint.y - cy, docPoint.x - cx) + Math.PI / 2);
        }

        redrawFromScene(ctx);
        shape.draw(ctx);
        renderViewport();
        drawBoundingBoxOverlay(shape);
        return true;
    }, [contextRef, redrawFromScene, renderViewport, drawBoundingBoxOverlay]);

    /** Handle pointer-up while in pending mode. Returns true if handled. */
    const onPointerUp = useCallback((): boolean => {
        if (pendingMode.current !== null) {
            pendingMode.current = null;
            dragStart.current = null;
            return true;
        }
        return false;
    }, []);

    const hasPending = useCallback(() => pendingShapeRef.current !== null, []);

    return {
        hasPending,
        enterPending,
        confirmPending,
        cancelPending,
        onPointerDown,
        onPointerMove,
        onPointerUp,
    };
};

export default usePendingPlacement;
