import { useCallback, useContext, useEffect, useRef } from "react";
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
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type HoverTarget =
    | { kind: 'resize'; handle: ResizeHandle; cursor: string }
    | { kind: 'rotate'; cursor: string }
    | { kind: 'move'; cursor: string }
    | { kind: 'outside'; cursor: string };

type ResizeHandleConfig = {
    position: { x: number; y: number };
    anchor: { x: number; y: number };
    affectsX: boolean;
    affectsY: boolean;
};

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
    n: { x: bb.x + bb.width / 2, y: bb.y },
    ne: { x: bb.x + bb.width, y: bb.y },
    e: { x: bb.x + bb.width, y: bb.y + bb.height / 2 },
    se: { x: bb.x + bb.width, y: bb.y + bb.height },
    s: { x: bb.x + bb.width / 2, y: bb.y + bb.height },
    sw: { x: bb.x, y: bb.y + bb.height },
    w: { x: bb.x, y: bb.y + bb.height / 2 },
});

const getHandleDefaultSigns = (handle: ResizeHandle) => {
    switch (handle) {
        case 'nw': return { x: -1, y: -1 };
        case 'n': return { x: 0, y: -1 };
        case 'ne': return { x: 1, y: -1 };
        case 'e': return { x: 1, y: 0 };
        case 'se': return { x: 1, y: 1 };
        case 's': return { x: 0, y: 1 };
        case 'sw': return { x: -1, y: 1 };
        case 'w': return { x: -1, y: 0 };
    }
};

const RESIZE_HANDLE_CONFIG: Record<ResizeHandle, ResizeHandleConfig> = {
    nw: { position: { x: -0.5, y: -0.5 }, anchor: { x: 0.5, y: 0.5 }, affectsX: true, affectsY: true },
    n: { position: { x: 0, y: -0.5 }, anchor: { x: 0, y: 0.5 }, affectsX: false, affectsY: true },
    ne: { position: { x: 0.5, y: -0.5 }, anchor: { x: -0.5, y: 0.5 }, affectsX: true, affectsY: true },
    e: { position: { x: 0.5, y: 0 }, anchor: { x: -0.5, y: 0 }, affectsX: true, affectsY: false },
    se: { position: { x: 0.5, y: 0.5 }, anchor: { x: -0.5, y: -0.5 }, affectsX: true, affectsY: true },
    s: { position: { x: 0, y: 0.5 }, anchor: { x: 0, y: -0.5 }, affectsX: false, affectsY: true },
    sw: { position: { x: -0.5, y: 0.5 }, anchor: { x: 0.5, y: -0.5 }, affectsX: true, affectsY: true },
    w: { position: { x: -0.5, y: 0 }, anchor: { x: 0.5, y: 0 }, affectsX: true, affectsY: false },
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

const getResizeCursor = (handle: ResizeHandle, rotation: number): string => {
    const { position } = RESIZE_HANDLE_CONFIG[handle];
    const angle = (Math.atan2(position.y, position.x) + rotation + Math.PI * 2) % Math.PI;
    const angleDeg = angle * (180 / Math.PI);

    if (angleDeg < 22.5 || angleDeg >= 157.5) return "ew-resize";
    if (angleDeg < 67.5) return "nwse-resize";
    if (angleDeg < 112.5) return "ns-resize";
    return "nesw-resize";
};

const getHandleAnchorPoint = (bb: BoundingBox, handle: ResizeHandle): Point => {
    const center = getBoundingBoxCenter(bb);
    const { anchor } = RESIZE_HANDLE_CONFIG[handle];
    return {
        x: center.x + anchor.x * bb.width,
        y: center.y + anchor.y * bb.height,
    };
};

const getHandleDrawPoint = (bb: BoundingBox, handle: ResizeHandle): Point => getBoundingBoxCorners(bb)[handle];

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
    const { canvasRef, contextRef, viewOffset, zoom, pendingShapeRef, redrawPendingOverlay, toolCursor } = useContext(PaintContext)!;
    const { replacementContextRef } = useContext(ReplacementContext)!;

    const pendingMode = useRef<PendingMode>(null);
    const dragStart = useRef<Point | null>(null);
    const resizeHandleRef = useRef<ResizeHandle | null>(null);
    const resizeAnchorRef = useRef<Point | null>(null);
    const resizeBoundsRef = useRef<BoundingBox | null>(null);
    const pendingRenderFrameRef = useRef<number | null>(null);

    const setCanvasCursor = useCallback((cursor: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.style.cursor = cursor;
    }, [canvasRef]);

    const cancelScheduledPendingRender = useCallback(() => {
        if (pendingRenderFrameRef.current !== null) {
            cancelAnimationFrame(pendingRenderFrameRef.current);
            pendingRenderFrameRef.current = null;
        }
    }, []);

    /** Resets all mutable drag/pending refs to their idle state. */
    const resetPendingState = useCallback(() => {
        cancelScheduledPendingRender();
        pendingShapeRef.current = null;
        pendingMode.current = null;
        dragStart.current = null;
        resizeHandleRef.current = null;
        resizeAnchorRef.current = null;
        resizeBoundsRef.current = null;
        setCanvasCursor(toolCursor.current);
    }, [cancelScheduledPendingRender, setCanvasCursor]);

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

        // Resize handles
        overlay.setLineDash([]);
        overlay.fillStyle = overlaySurface;
        overlay.strokeStyle = overlayAccent;
        overlay.lineWidth = lw;
        for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]) {
            const { x: hx, y: hy } = getHandleDrawPoint(bb, handle);
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

    // Keep redrawPendingOverlay.current up-to-date so renderViewport() can
    // always redraw the bounding box after clearing the overlay (e.g. on resize).
    useEffect(() => {
        redrawPendingOverlay.current = () => {
            const shape = pendingShapeRef.current;
            if (shape) drawBoundingBoxOverlay(shape);
        };
    }, [drawBoundingBoxOverlay, pendingShapeRef, redrawPendingOverlay]);

    const renderPendingShapeNow = useCallback(() => {
        const shape = pendingShapeRef.current;
        const ctx = contextRef.current;
        if (!shape || !ctx) return;

        redrawFromScene(ctx);
        shape.draw(ctx);
        renderViewport();
        drawBoundingBoxOverlay(shape);
    }, [contextRef, drawBoundingBoxOverlay, redrawFromScene, renderViewport]);

    const schedulePendingRender = useCallback(() => {
        if (pendingRenderFrameRef.current !== null) return;
        pendingRenderFrameRef.current = requestAnimationFrame(() => {
            pendingRenderFrameRef.current = null;
            renderPendingShapeNow();
        });
    }, [renderPendingShapeNow]);

    const flushPendingRender = useCallback(() => {
        cancelScheduledPendingRender();
        renderPendingShapeNow();
    }, [cancelScheduledPendingRender, renderPendingShapeNow]);

    const getPointerDocPoint = useCallback((shape: Shape, docPoint: Point, canvasPoint?: Point): Point => (
        canvasPoint ?? (shape.pixelated
            ? { x: docPoint.x * shape.pixelSize, y: docPoint.y * shape.pixelSize }
            : docPoint)
    ), []);

    const getHoverTarget = useCallback((shape: Shape, docPoint: Point, canvasPoint?: Point): HoverTarget => {
        const dpr = window.devicePixelRatio || 1;
        const bb = getResizeBoundsInDocSpace(shape);
        const center = getBoundingBoxCenter(bb);
        const pointerDocPoint = getPointerDocPoint(shape, docPoint, canvasPoint);
        const handleDistDoc = ROTATION_HANDLE_DIST_PX / (zoom * dpr);
        const toScreen = (p: Point) => ({
            x: (p.x * zoom + viewOffset.x) * dpr,
            y: (p.y * zoom + viewOffset.y) * dpr,
        });
        const screenPoint = toScreen(pointerDocPoint);

        for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]) {
            const handleWorld = rotatePoint(getHandleDrawPoint(bb, handle), center, shape.rotation);
            const handleScreen = toScreen(handleWorld);
            if (Math.hypot(screenPoint.x - handleScreen.x, screenPoint.y - handleScreen.y) <= RESIZE_HANDLE_HIT_RADIUS_PX) {
                return { kind: 'resize', handle, cursor: getResizeCursor(handle, shape.rotation) };
            }
        }

        const rotationHandle = getRotationHandleWorld(bb, shape.rotation, center.x, center.y, handleDistDoc);
        const rotationHandleScreen = toScreen(rotationHandle);
        if (Math.hypot(screenPoint.x - rotationHandleScreen.x, screenPoint.y - rotationHandleScreen.y) <= ROTATION_HANDLE_RADIUS_PX + 4) {
            return { kind: 'rotate', cursor: "grab" };
        }

        if (isInsideRotatedBBox(pointerDocPoint, bb, shape.rotation, center.x, center.y)) {
            return { kind: 'move', cursor: "move" };
        }

        return { kind: 'outside', cursor: "" };
    }, [getPointerDocPoint, viewOffset.x, viewOffset.y, zoom]);

    /** Enter pending mode: store the shape and draw its bounding box overlay. */
    const enterPending = useCallback((shape: Shape) => {
        resetPendingState();
        pendingShapeRef.current = shape;
        flushPendingRender();
    }, [flushPendingRender, resetPendingState]);

    /** Commit the pending shape to the scene and clear the overlay. */
    const confirmPending = useCallback(() => {
        const shape = pendingShapeRef.current;
        if (!shape) return;
        resetPendingState();
        pushShape(shape);
        renderViewport();
    }, [pushShape, renderViewport, resetPendingState]);

    /** Discard the pending shape and restore the canvas to the committed scene. */
    const cancelPending = useCallback(() => {
        const ctx = contextRef.current;
        resetPendingState();
        if (ctx) {
            redrawFromScene(ctx);
            renderViewport();
        }
    }, [contextRef, redrawFromScene, renderViewport, resetPendingState]);

    /**
     * Handle a pointer-down event while a shape is pending.
     * Returns true if the event was consumed (caller should not start new drawing).
     */
    const onPointerDown = useCallback((docPoint: Point, canvasPoint?: Point): boolean => {
        const shape = pendingShapeRef.current;
        if (!shape) return false;
        const hoverTarget = getHoverTarget(shape, docPoint, canvasPoint);

        if (hoverTarget.kind === 'resize') {
            pendingMode.current = 'resize';
            resizeHandleRef.current = hoverTarget.handle;
            const resizeBounds = getResizeBoundsInDocSpace(shape);
            resizeBoundsRef.current = resizeBounds;
            resizeAnchorRef.current = rotatePoint(
                getHandleAnchorPoint(resizeBounds, hoverTarget.handle),
                getBoundingBoxCenter(resizeBounds),
                shape.rotation,
            );
            dragStart.current = docPoint;
            setCanvasCursor(hoverTarget.cursor);
            return true;
        }

        if (hoverTarget.kind === 'rotate') {
            pendingMode.current = 'rotate';
            dragStart.current = docPoint;
            setCanvasCursor("grabbing");
            return true;
        }

        if (hoverTarget.kind === 'move') {
            pendingMode.current = 'move';
            dragStart.current = docPoint;
            setCanvasCursor("grabbing");
            return true;
        }

        // Clicked outside: commit shape
        confirmPending();
        return true;
    }, [confirmPending, getHoverTarget, setCanvasCursor]);

    /**
     * Handle pointer-move while in pending mode.
     * Returns true if handled (caller should skip normal drawing logic).
     */
    const onPointerMove = useCallback((docPoint: Point, canvasPoint?: Point): boolean => {
        const shape = pendingShapeRef.current;
        if (!shape) return false;

        const ctx = contextRef.current;
        if (!ctx) return false;

        if (pendingMode.current === null || !dragStart.current) {
            setCanvasCursor(getHoverTarget(shape, docPoint, canvasPoint).cursor);
            return true;
        }

        if (pendingMode.current === 'move') {
            shape.moveBy(docPoint.x - dragStart.current.x, docPoint.y - dragStart.current.y);
            dragStart.current = docPoint;
            setCanvasCursor("grabbing");
        } else if (pendingMode.current === 'rotate') {
            const { x: cx, y: cy } = shape.getCenter();
            // atan2 gives angle from center to pointer; +π/2 aligns "up" with 0°
            shape.rotateTo(Math.atan2(docPoint.y - cy, docPoint.x - cx) + Math.PI / 2);
            setCanvasCursor("grabbing");
        } else if (pendingMode.current === 'resize' && resizeHandleRef.current && resizeAnchorRef.current && resizeBoundsRef.current) {
            const handle = resizeHandleRef.current;
            const anchor = resizeAnchorRef.current;
            const handleConfig = RESIZE_HANDLE_CONFIG[handle];
            const dragPoint = shape.pixelated
                ? {
                    x: (docPoint.x + (handleConfig.position.x > 0 ? 1 : 0)) * shape.pixelSize,
                    y: (docPoint.y + (handleConfig.position.y > 0 ? 1 : 0)) * shape.pixelSize,
                }
                : getPointerDocPoint(shape, docPoint, canvasPoint);

            const axisX = { x: Math.cos(shape.rotation), y: Math.sin(shape.rotation) };
            const axisY = { x: -Math.sin(shape.rotation), y: Math.cos(shape.rotation) };
            const delta = {
                x: dragPoint.x - anchor.x,
                y: dragPoint.y - anchor.y,
            };

            const projectedWidth = delta.x * axisX.x + delta.y * axisX.y;
            const projectedHeight = delta.x * axisY.x + delta.y * axisY.y;
            let minX = handleConfig.affectsX ? Math.min(0, projectedWidth) : -resizeBoundsRef.current.width / 2;
            let maxX = handleConfig.affectsX ? Math.max(0, projectedWidth) : resizeBoundsRef.current.width / 2;
            let minY = handleConfig.affectsY ? Math.min(0, projectedHeight) : -resizeBoundsRef.current.height / 2;
            let maxY = handleConfig.affectsY ? Math.max(0, projectedHeight) : resizeBoundsRef.current.height / 2;

            if (shape.kind === 'square' || shape.kind === 'circle') {
                const defaultSigns = getHandleDefaultSigns(handle);

                if (handleConfig.affectsX && handleConfig.affectsY) {
                    const widthSign = projectedWidth === 0 ? defaultSigns.x : Math.sign(projectedWidth);
                    const heightSign = projectedHeight === 0 ? defaultSigns.y : Math.sign(projectedHeight);
                    const size = Math.max(Math.abs(projectedWidth), Math.abs(projectedHeight));
                    minX = Math.min(0, widthSign * size);
                    maxX = Math.max(0, widthSign * size);
                    minY = Math.min(0, heightSign * size);
                    maxY = Math.max(0, heightSign * size);
                } else if (handleConfig.affectsX) {
                    const widthSign = projectedWidth === 0 ? defaultSigns.x : Math.sign(projectedWidth);
                    const size = Math.abs(projectedWidth);
                    minX = Math.min(0, widthSign * size);
                    maxX = Math.max(0, widthSign * size);
                    minY = -size / 2;
                    maxY = size / 2;
                } else if (handleConfig.affectsY) {
                    const heightSign = projectedHeight === 0 ? defaultSigns.y : Math.sign(projectedHeight);
                    const size = Math.abs(projectedHeight);
                    minX = -size / 2;
                    maxX = size / 2;
                    minY = Math.min(0, heightSign * size);
                    maxY = Math.max(0, heightSign * size);
                }
            }

            const width = maxX - minX;
            const height = maxY - minY;
            const center = {
                x: anchor.x + ((minX + maxX) / 2) * axisX.x + ((minY + maxY) / 2) * axisY.x,
                y: anchor.y + ((minX + maxX) / 2) * axisX.y + ((minY + maxY) / 2) * axisY.y,
            };
            const docBounds = normalizeBoundingBox(
                { x: center.x - width / 2, y: center.y - height / 2 },
                { x: center.x + width / 2, y: center.y + height / 2 },
            );

            shape.resizeToBoundingBox(toShapeBoundingBox(shape, docBounds));
            setCanvasCursor(getResizeCursor(handle, shape.rotation));
        }

        schedulePendingRender();
        return true;
    }, [contextRef, getHoverTarget, getPointerDocPoint, schedulePendingRender, setCanvasCursor]);

    /** Handle pointer-up while in pending mode. Returns true if handled. */
    const onPointerUp = useCallback((): boolean => {
        if (pendingMode.current !== null) {
            const shape = pendingShapeRef.current;
            const activeMode = pendingMode.current;
            const activeHandle = resizeHandleRef.current;
            flushPendingRender();
            pendingMode.current = null;
            dragStart.current = null;
            resizeHandleRef.current = null;
            resizeAnchorRef.current = null;
            resizeBoundsRef.current = null;
            if (shape && activeMode === 'resize' && activeHandle) {
                setCanvasCursor(getResizeCursor(activeHandle, shape.rotation));
            } else if (activeMode === 'move') {
                setCanvasCursor("move");
            } else if (activeMode === 'rotate') {
                setCanvasCursor("grab");
            }
            return true;
        }
        return false;
    }, [flushPendingRender, setCanvasCursor]);

    return {
        enterPending,
        confirmPending,
        cancelPending,
        onPointerDown,
        onPointerMove,
        onPointerUp,
    };
};

export default usePendingPlacement;
