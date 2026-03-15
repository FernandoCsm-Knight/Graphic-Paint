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
/** Screen-space hit radius for resize handles (px). */
const RESIZE_HANDLE_HIT_RADIUS_PX = 10;

type PendingMode = 'move' | 'rotate' | 'resize' | null;
type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw';

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

const rotatePoint = (point: Point, center: Point, angle: number): Point => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
    };
};

const getBoundingBoxCenter = (bb: BoundingBox): Point => ({
    x: bb.x + bb.width / 2,
    y: bb.y + bb.height / 2,
});

const getBoundingBoxCorners = (bb: BoundingBox): Record<ResizeHandle, Point> => ({
    nw: { x: bb.x, y: bb.y },
    ne: { x: bb.x + bb.width, y: bb.y },
    se: { x: bb.x + bb.width, y: bb.y + bb.height },
    sw: { x: bb.x, y: bb.y + bb.height },
});

const getOppositeHandle = (handle: ResizeHandle): ResizeHandle => {
    switch (handle) {
        case 'nw': return 'se';
        case 'ne': return 'sw';
        case 'se': return 'nw';
        case 'sw': return 'ne';
    }
};

const getHandleDefaultSigns = (handle: ResizeHandle) => {
    switch (handle) {
        case 'nw': return { x: -1, y: -1 };
        case 'ne': return { x: 1, y: -1 };
        case 'se': return { x: 1, y: 1 };
        case 'sw': return { x: -1, y: 1 };
    }
};

const getResizeBoundsInDocSpace = (shape: Shape): BoundingBox => getShapeBoundingBoxInDocSpace(shape);

const normalizeBoundingBox = (first: Point, second: Point): BoundingBox => ({
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    width: Math.abs(second.x - first.x),
    height: Math.abs(second.y - first.y),
});

const toShapeBoundingBox = (shape: Shape, docBounds: BoundingBox): BoundingBox => {
    if (!shape.pixelated) return docBounds;

    const { pixelSize } = shape;
    return {
        x: Math.round(docBounds.x / pixelSize),
        y: Math.round(docBounds.y / pixelSize),
        width: Math.max(0, Math.round(docBounds.width / pixelSize) - 1),
        height: Math.max(0, Math.round(docBounds.height / pixelSize) - 1),
    };
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
    const resizeHandleRef = useRef<ResizeHandle | null>(null);
    const resizeAnchorRef = useRef<Point | null>(null);

    /** Resets all mutable drag/pending refs to their idle state. */
    const resetPendingState = () => {
        pendingShapeRef.current = null;
        pendingMode.current = null;
        dragStart.current = null;
        resizeHandleRef.current = null;
        resizeAnchorRef.current = null;
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
        const bb = getResizeBoundsInDocSpace(shape);
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
    const onPointerDown = useCallback((docPoint: Point, canvasPoint?: Point): boolean => {
        const shape = pendingShapeRef.current;
        if (!shape) return false;

        const dpr = window.devicePixelRatio || 1;
        const bb = getResizeBoundsInDocSpace(shape);
        const center = getBoundingBoxCenter(bb);
        // handleDistDoc in canvas-pixel (doc) space
        const handleDistDoc = ROTATION_HANDLE_DIST_PX / (zoom * dpr);
        const pointerDocPoint = canvasPoint ?? (shape.pixelated
            ? { x: docPoint.x * shape.pixelSize, y: docPoint.y * shape.pixelSize }
            : docPoint);

        const toScreen = (p: Point) => ({
            x: (p.x * zoom + viewOffset.x) * dpr,
            y: (p.y * zoom + viewOffset.y) * dpr,
        });

        const sp = toScreen(pointerDocPoint);
        const corners = getBoundingBoxCorners(bb);
        for (const handle of ['nw', 'ne', 'se', 'sw'] as ResizeHandle[]) {
            const handleWorld = rotatePoint(corners[handle], center, shape.rotation);
            const sh = toScreen(handleWorld);
            const distToHandle = Math.hypot(sp.x - sh.x, sp.y - sh.y);

            if (distToHandle <= RESIZE_HANDLE_HIT_RADIUS_PX) {
                pendingMode.current = 'resize';
                resizeHandleRef.current = handle;
                resizeAnchorRef.current = rotatePoint(corners[getOppositeHandle(handle)], center, shape.rotation);
                dragStart.current = docPoint;
                return true;
            }
        }

        const handleWorld = getRotationHandleWorld(bb, shape.rotation, center.x, center.y, handleDistDoc);
        const sh = toScreen(handleWorld);
        const distToHandle = Math.hypot(sp.x - sh.x, sp.y - sh.y);

        if (distToHandle <= ROTATION_HANDLE_RADIUS_PX + 4) {
            pendingMode.current = 'rotate';
            dragStart.current = docPoint;
            return true;
        }

        // isInsideRotatedBBox works in grid units (same space as docPoint)
        if (isInsideRotatedBBox(pointerDocPoint, bb, shape.rotation, center.x, center.y)) {
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
    const onPointerMove = useCallback((docPoint: Point, canvasPoint?: Point): boolean => {
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
        } else if (pendingMode.current === 'resize' && resizeHandleRef.current && resizeAnchorRef.current) {
            const handle = resizeHandleRef.current;
            const anchor = resizeAnchorRef.current;
            const dragPoint = shape.pixelated
                ? {
                    x: (docPoint.x + ((handle === 'ne' || handle === 'se') ? 1 : 0)) * shape.pixelSize,
                    y: (docPoint.y + ((handle === 'sw' || handle === 'se') ? 1 : 0)) * shape.pixelSize,
                }
                : (canvasPoint ?? docPoint);

            const axisX = { x: Math.cos(shape.rotation), y: Math.sin(shape.rotation) };
            const axisY = { x: -Math.sin(shape.rotation), y: Math.cos(shape.rotation) };
            const delta = {
                x: dragPoint.x - anchor.x,
                y: dragPoint.y - anchor.y,
            };

            let projectedWidth = delta.x * axisX.x + delta.y * axisX.y;
            let projectedHeight = delta.x * axisY.x + delta.y * axisY.y;

            if (shape.kind === 'square' || shape.kind === 'circle') {
                const defaultSigns = getHandleDefaultSigns(handle);
                const widthSign = projectedWidth === 0 ? defaultSigns.x : Math.sign(projectedWidth);
                const heightSign = projectedHeight === 0 ? defaultSigns.y : Math.sign(projectedHeight);
                const size = Math.max(Math.abs(projectedWidth), Math.abs(projectedHeight));
                projectedWidth = widthSign * size;
                projectedHeight = heightSign * size;
            }

            const originX = Math.min(0, projectedWidth);
            const originY = Math.min(0, projectedHeight);
            const width = Math.abs(projectedWidth);
            const height = Math.abs(projectedHeight);
            const center = {
                x: anchor.x + (originX + width / 2) * axisX.x + (originY + height / 2) * axisY.x,
                y: anchor.y + (originX + width / 2) * axisX.y + (originY + height / 2) * axisY.y,
            };
            const docBounds = normalizeBoundingBox(
                { x: center.x - width / 2, y: center.y - height / 2 },
                { x: center.x + width / 2, y: center.y + height / 2 },
            );

            shape.resizeToBoundingBox(toShapeBoundingBox(shape, docBounds));
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
            resizeHandleRef.current = null;
            resizeAnchorRef.current = null;
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
