import { useCallback, useContext, useEffect, useRef } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { ReplacementContext } from "../_context/ReplacementContext";
import { SettingsContext } from "../_context/SettingsContext";
import { Shape } from "../_shapes/ShapeTypes";
import type { BoundingBox } from "../_shapes/ShapeTypes";
import type { ResizeOptions } from "../_shapes/ShapeTypes";
import ShapeGroup from "../_shapes/ShapeGroup";
import { getShapeBoundingBoxInDocSpace, isPointInsideBoundingBoxInclusive } from "../_utils/boundingBox";
import { getShapeVertices, moveShapeVertex } from "../_utils/vertexUtils";
import type { SceneItem } from "./useScene";
import type { Point } from "@/types/geometry";
import { toPixels } from "../_types/Graphics";
import {
    resolveThemeCssVar,
    THEME_ACCENT_CSS_VAR,
    THEME_SURFACE_CSS_VAR,
} from "@/utils/workspaceGrid";

export type EnterPendingOptions = {
    /** Called when the pending shape is cancelled; use to restore scene state. */
    onCancel?: () => void;
    /** Called instead of pushShape(shape) when the pending shape is confirmed. */
    onConfirm?: () => void;
    /** Called when the lock button is clicked on a ShapeGroup overlay. */
    onLock?: () => void;
    /** Whether the pending ShapeGroup is already a persisted group (shows locked icon). */
    isGroupLocked?: boolean;
};

/** Screen-space radius of the rotation handle circle (px). */
const ROTATION_HANDLE_RADIUS_PX = 8;
/** Screen-space distance from bbox top-center to rotation handle center (px). */
const ROTATION_HANDLE_DIST_PX = 30;
/** Screen-space hit radius for resize/vertex handles (px). */
const RESIZE_HANDLE_HIT_RADIUS_PX = 10;
/** Screen-space radius of vertex handle circles (px). */
const VERTEX_HANDLE_RADIUS_PX = 6;

type PendingMode = 'move' | 'rotate' | 'resize' | 'vertex' | null;
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type HoverTarget =
    | { kind: 'resize'; handle: ResizeHandle; cursor: string }
    | { kind: 'rotate'; cursor: string }
    | { kind: 'move'; cursor: string }
    | { kind: 'outside'; cursor: string }
    | { kind: 'vertex'; vertexId: string; cursor: string };

type ResizeHandleConfig = {
    position: { x: number; y: number };
    anchor: { x: number; y: number };
    affectsX: boolean;
    affectsY: boolean;
};

type OverlayTransform = {
    center: Point;
    angle: number;
    halfSize: { hw: number; hh: number };
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
    return { x: cx - localY * sin, y: cy + localY * cos };
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

const getOverlayTransformFromBounds = (bb: BoundingBox, angle: number = 0): OverlayTransform => ({
    center: getBoundingBoxCenter(bb),
    angle,
    halfSize: { hw: bb.width / 2, hh: bb.height / 2 },
});

const getBoundsFromOverlayTransform = (transform: OverlayTransform): BoundingBox => ({
    x: transform.center.x - transform.halfSize.hw,
    y: transform.center.y - transform.halfSize.hh,
    width: transform.halfSize.hw * 2,
    height: transform.halfSize.hh * 2,
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
    const maxX = docBounds.x + docBounds.width;
    const maxY = docBounds.y + docBounds.height;
    return {
        x: Math.round(docBounds.x / pixelSize),
        y: Math.round(docBounds.y / pixelSize),
        width: Math.max(0, Math.round(maxX / pixelSize) - Math.round(docBounds.x / pixelSize) - 1),
        height: Math.max(0, Math.round(maxY / pixelSize) - Math.round(docBounds.y / pixelSize) - 1),
    };
};

const resolveResizeAxisSign = (projected: number, defaultSign: number): number => {
    if (defaultSign === 0) return 0;
    if (projected === 0) return defaultSign;
    return Math.sign(projected) || defaultSign;
};

const getPixelatedResizeEdge = (
    coordinate: number,
    anchor: number,
    defaultSign: number,
    pixelSize: number,
): number => {
    const start = Math.floor(coordinate / pixelSize) * pixelSize;
    const end = start + pixelSize;
    const center = start + pixelSize / 2;
    const sign = center === anchor ? defaultSign : (center > anchor ? 1 : -1);
    return sign >= 0 ? end : start;
};

const rotatePointAround = (point: Point, pivot: Point, angle: number): Point => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    return {
        x: pivot.x + dx * cos - dy * sin,
        y: pivot.y + dx * sin + dy * cos,
    };
};

const toOverlayLocalPoint = (point: Point, transform: OverlayTransform): Point =>
    rotatePointAround(point, transform.center, -transform.angle);

const toOverlayWorldPoint = (point: Point, transform: OverlayTransform): Point =>
    rotatePointAround(point, transform.center, transform.angle);

const toPixelatedShapeBoundingBox = (shape: Shape, docBounds: BoundingBox): BoundingBox => {
    const { pixelSize } = shape;
    const minX = Math.round(docBounds.x / pixelSize);
    const minY = Math.round(docBounds.y / pixelSize);
    const maxX = Math.round((docBounds.x + docBounds.width) / pixelSize);
    const maxY = Math.round((docBounds.y + docBounds.height) / pixelSize);
    return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX - 1),
        height: Math.max(0, maxY - minY - 1),
    };
};

const toResizeBounds = (shape: Shape, docBounds: BoundingBox): BoundingBox =>
    shape.pixelated ? toPixelatedShapeBoundingBox(shape, docBounds) : docBounds;

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

/** Converts a vertex point from shape-space to doc-space (handles pixelated grid units). */
const vertexToDocSpace = (point: Point, shape: Shape): Point =>
    shape.pixelated ? toPixels(point, shape.pixelSize) : point;

/**
 * Manages the "pending placement" state after a shape is drawn but before it
 * is committed to the scene.
 *
 * Supports two placement modes (controlled by SettingsContext.placementMode):
 *  - "bbox"     → translate, rotate, resize via bounding box handles (default)
 *  - "vertices" → drag individual geometric vertices; rotate and resize are disabled
 *
 * In both modes clicking outside the shape commits it.
 */
const usePendingPlacement = ({ renderViewport, redrawFromScene, pushShape }: PendingPlacementInput) => {
    const { canvasRef, contextRef, pendingShapeRef, redrawPendingOverlayRef, toolCursorRef } = useContext(PaintContext)!;
    const { viewOffset, zoom } = useWorkspaceContext();
    const { replacementContextRef } = useContext(ReplacementContext)!;
    const { placementMode } = useContext(SettingsContext)!;

    const pendingMode = useRef<PendingMode>(null);
    const dragStart = useRef<Point | null>(null);
    const resizeHandleRef = useRef<ResizeHandle | null>(null);
    const resizeAnchorRef = useRef<Point | null>(null);
    const resizeBoundsRef = useRef<BoundingBox | null>(null);
    const vertexIdRef = useRef<string | null>(null);
    const rotatePivotRef = useRef<Point | null>(null);
    const rotateStartAngleRef = useRef<number>(0);
    // Visual OBB overlay — angle and half-sizes are tracked independently from the
    // shape's (baked) geometry so the dashed box rotates with the shape.
    const overlayCenterRef    = useRef<Point | null>(null);
    const overlayAngleRef     = useRef<number>(0);
    const overlayAngleBaseRef = useRef<number>(0);
    const overlayHalfSizeRef  = useRef<{ hw: number; hh: number } | null>(null);
    const pendingRenderFrameRef = useRef<number | null>(null);
    const onCancelCallbackRef  = useRef<(() => void) | null>(null);
    const onConfirmCallbackRef = useRef<(() => void) | null>(null);
    const onLockCallbackRef    = useRef<(() => void) | null>(null);
    const isGroupLockedRef     = useRef<boolean>(false);
    const lockButtonRef        = useRef<HTMLButtonElement | null>(null);

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
        vertexIdRef.current = null;
        rotatePivotRef.current = null;
        rotateStartAngleRef.current = 0;
        overlayCenterRef.current = null;
        overlayAngleRef.current = 0;
        overlayAngleBaseRef.current = 0;
        overlayHalfSizeRef.current = null;
        onCancelCallbackRef.current  = null;
        onConfirmCallbackRef.current = null;
        onLockCallbackRef.current    = null;
        isGroupLockedRef.current     = false;
        if (lockButtonRef.current) lockButtonRef.current.style.display = 'none';
        setCanvasCursor(toolCursorRef.current);
    }, [cancelScheduledPendingRender, pendingShapeRef, setCanvasCursor, toolCursorRef]);

    // ── Bounding-box overlay (existing behaviour) ─────────────────────────────

    const drawBoundingBoxOverlay = useCallback((shape: Shape) => {
        const overlay = replacementContextRef.current;
        if (!overlay) return;

        const dpr = window.devicePixelRatio || 1;
        const scale = zoom * dpr;
        const lw = 1 / scale;
        const handleDistDoc = ROTATION_HANDLE_DIST_PX / scale;
        const handleRadiusDoc = ROTATION_HANDLE_RADIUS_PX / scale;
        const cornerSize = 6 / scale;
        const overlayAccent = resolveThemeCssVar(THEME_ACCENT_CSS_VAR, "#1d4ed8");
        const overlaySurface = resolveThemeCssVar(THEME_SURFACE_CSS_VAR, "#ffffff");

        // Center is always derived from the current AABB (correct after baked rotation).
        const bb = getResizeBoundsInDocSpace(shape);
        const overlayCenter = overlayCenterRef.current ?? getBoundingBoxCenter(bb);
        const cx = overlayCenter.x;
        const cy = overlayCenter.y;

        // OBB half-sizes and visual angle tracked independently from shape geometry.
        const halfSize = overlayHalfSizeRef.current;
        const hw = halfSize ? halfSize.hw : bb.width  / 2;
        const hh = halfSize ? halfSize.hh : bb.height / 2;
        const angle = overlayAngleRef.current;

        const obbBb: BoundingBox = { x: cx - hw, y: cy - hh, width: hw * 2, height: hh * 2 };

        overlay.save();
        overlay.setTransform(scale, 0, 0, scale, viewOffset.x * dpr, viewOffset.y * dpr);

        // Rotate the entire overlay around the shape center so the OBB follows the shape.
        overlay.translate(cx, cy);
        overlay.rotate(angle);
        overlay.translate(-cx, -cy);

        // Dashed bounding box
        overlay.setLineDash([4 * lw, 4 * lw]);
        overlay.lineWidth = lw;
        overlay.strokeStyle = overlayAccent;
        overlay.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);

        // Resize handles
        overlay.setLineDash([]);
        overlay.fillStyle = overlaySurface;
        overlay.strokeStyle = overlayAccent;
        overlay.lineWidth = lw;
        for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]) {
            const { x: hx, y: hy } = getHandleDrawPoint(obbBb, handle);
            overlay.fillRect(hx - cornerSize / 2, hy - cornerSize / 2, cornerSize, cornerSize);
            overlay.strokeRect(hx - cornerSize / 2, hy - cornerSize / 2, cornerSize, cornerSize);
        }

        // Rotation handle stem + circle (drawn above OBB top-center in rotated space)
        overlay.beginPath();
        overlay.moveTo(cx, cy - hh);
        overlay.lineTo(cx, cy - hh - handleDistDoc);
        overlay.stroke();

        overlay.beginPath();
        overlay.arc(cx, cy - hh - handleDistDoc, handleRadiusDoc, 0, Math.PI * 2);
        overlay.fillStyle = overlaySurface;
        overlay.fill();
        overlay.strokeStyle = overlayAccent;
        overlay.stroke();

        overlay.restore();

        // Position the HTML lock button for ShapeGroup.
        // The canvas transform is already restored, so compute the rotated doc position manually.
        if (shape instanceof ShapeGroup && lockButtonRef.current) {
            const btn = lockButtonRef.current;
            const locked = isGroupLockedRef.current;
            // Near the top-right corner of the OBB, rotated into doc space.
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const lxLocal = hw - 24 / zoom;
            const lyLocal = -(hh + 24 / zoom);
            const lockDocX = cx + lxLocal * cos - lyLocal * sin;
            const lockDocY = cy + lxLocal * sin + lyLocal * cos;
            btn.style.display = 'flex';
            btn.style.left = `${lockDocX * zoom + viewOffset.x}px`;
            btn.style.top  = `${lockDocY * zoom + viewOffset.y}px`;
            const lockedSpan   = btn.querySelector<HTMLElement>('[data-icon="locked"]');
            const unlockedSpan = btn.querySelector<HTMLElement>('[data-icon="unlocked"]');
            if (lockedSpan)   lockedSpan.style.display   = locked ? 'flex' : 'none';
            if (unlockedSpan) unlockedSpan.style.display = locked ? 'none' : 'flex';
        }
    }, [replacementContextRef, zoom, viewOffset]);

    // ── Vertex overlay ────────────────────────────────────────────────────────

    const drawVerticesOverlay = useCallback((shape: Shape) => {
        const vertices = getShapeVertices(shape);

        // Shapes without vertices (Ellipse, Circle) fall back to bbox overlay.
        if (vertices.length === 0) {
            drawBoundingBoxOverlay(shape);
            return;
        }

        const overlay = replacementContextRef.current;
        if (!overlay) return;

        const dpr = window.devicePixelRatio || 1;
        const scale = zoom * dpr;
        const lw = 1 / scale;
        const handleRadiusDoc = VERTEX_HANDLE_RADIUS_PX / scale;
        const overlayAccent = resolveThemeCssVar(THEME_ACCENT_CSS_VAR, "#1d4ed8");
        const overlaySurface = resolveThemeCssVar(THEME_SURFACE_CSS_VAR, "#ffffff");

        // Convert vertex positions from shape-space to doc-space.
        const docVertices = vertices.map(v => ({
            id: v.id,
            pos: vertexToDocSpace(v.point, shape),
        }));

        overlay.save();
        overlay.setTransform(scale, 0, 0, scale, viewOffset.x * dpr, viewOffset.y * dpr);

        // Dashed outline connecting the vertices.
        if (docVertices.length >= 2) {
            overlay.beginPath();
            overlay.setLineDash([4 * lw, 4 * lw]);
            overlay.lineWidth = lw;
            overlay.strokeStyle = overlayAccent;
            overlay.moveTo(docVertices[0].pos.x, docVertices[0].pos.y);
            for (let i = 1; i < docVertices.length; i++) {
                overlay.lineTo(docVertices[i].pos.x, docVertices[i].pos.y);
            }
            // Close the outline for polygons (3+ vertices); leave open for lines.
            if (docVertices.length > 2) overlay.closePath();
            overlay.stroke();
            overlay.setLineDash([]);
        }

        // Vertex handle circles.
        overlay.fillStyle = overlaySurface;
        overlay.strokeStyle = overlayAccent;
        overlay.lineWidth = lw;
        for (const { pos } of docVertices) {
            overlay.beginPath();
            overlay.arc(pos.x, pos.y, handleRadiusDoc, 0, Math.PI * 2);
            overlay.fill();
            overlay.stroke();
        }

        overlay.restore();
    }, [drawBoundingBoxOverlay, replacementContextRef, zoom, viewOffset]);

    // ── Unified overlay dispatcher ────────────────────────────────────────────

    const drawOverlay = useCallback((shape: Shape) => {
        if (placementMode === 'vertices') {
            drawVerticesOverlay(shape);
        } else {
            drawBoundingBoxOverlay(shape);
        }
    }, [placementMode, drawVerticesOverlay, drawBoundingBoxOverlay]);

    // Keep redrawPendingOverlayRef.current up-to-date whenever zoom/viewOffset/mode change.
    useEffect(() => {
        redrawPendingOverlayRef.current = () => {
            const shape = pendingShapeRef.current;
            if (shape) drawOverlay(shape);
        };
    }, [drawOverlay, pendingShapeRef, redrawPendingOverlayRef]);

    const renderPendingShapeNow = useCallback(() => {
        const shape = pendingShapeRef.current;
        const ctx = contextRef.current;
        if (!shape || !ctx) return;

        redrawFromScene(ctx);
        shape.draw(ctx);
        renderViewport();
        drawOverlay(shape);
    }, [contextRef, drawOverlay, pendingShapeRef, redrawFromScene, renderViewport]);

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
        const center = overlayCenterRef.current ?? getBoundingBoxCenter(bb);
        const pointerDocPoint = getPointerDocPoint(shape, docPoint, canvasPoint);
        const toScreen = (p: Point) => ({
            x: (p.x * zoom + viewOffset.x) * dpr,
            y: (p.y * zoom + viewOffset.y) * dpr,
        });
        const screenPoint = toScreen(pointerDocPoint);

        // ── Vertex mode ───────────────────────────────────────────────────────
        if (placementMode === 'vertices') {
            const vertices = getShapeVertices(shape);

            if (vertices.length > 0) {
                for (const v of vertices) {
                    const vDocPos = vertexToDocSpace(v.point, shape);
                    const vScreen = toScreen(vDocPos);
                    if (Math.hypot(screenPoint.x - vScreen.x, screenPoint.y - vScreen.y) <= RESIZE_HANDLE_HIT_RADIUS_PX) {
                        return { kind: 'vertex', vertexId: v.id, cursor: 'crosshair' };
                    }
                }

                if (isPointInsideBoundingBoxInclusive(pointerDocPoint, bb)) {
                    return { kind: 'move', cursor: 'move' };
                }

                return { kind: 'outside', cursor: '' };
            }

            // No vertices → fall through to bbox mode (Ellipse, Circle, etc.)
        }

        // ── BBox mode ─────────────────────────────────────────────────────────
        const handleDistDoc = ROTATION_HANDLE_DIST_PX / (zoom * dpr);

        // OBB dimensions and visual angle — unrotate the pointer into OBB-local space
        // so handle hit-testing matches the visually drawn (rotated) overlay.
        const halfSize = overlayHalfSizeRef.current;
        const obbHw = halfSize ? halfSize.hw : bb.width  / 2;
        const obbHh = halfSize ? halfSize.hh : bb.height / 2;
        const angle  = overlayAngleRef.current;

        const cos = Math.cos(-angle), sin = Math.sin(-angle);
        const pdx = pointerDocPoint.x - center.x;
        const pdy = pointerDocPoint.y - center.y;
        const localPointer: Point = {
            x: center.x + pdx * cos - pdy * sin,
            y: center.y + pdx * sin + pdy * cos,
        };
        const localScreenPoint = toScreen(localPointer);

        const obbBb: BoundingBox = {
            x: center.x - obbHw,
            y: center.y - obbHh,
            width:  obbHw * 2,
            height: obbHh * 2,
        };

        for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]) {
            const handleWorld = getHandleDrawPoint(obbBb, handle);
            const handleScreen = toScreen(handleWorld);
            if (Math.hypot(localScreenPoint.x - handleScreen.x, localScreenPoint.y - handleScreen.y) <= RESIZE_HANDLE_HIT_RADIUS_PX) {
                return { kind: 'resize', handle, cursor: getResizeCursor(handle, 0) };
            }
        }

        const rotationHandle = getRotationHandleWorld(obbBb, 0, center.x, center.y, handleDistDoc);
        const rotationHandleScreen = toScreen(rotationHandle);
        if (Math.hypot(localScreenPoint.x - rotationHandleScreen.x, localScreenPoint.y - rotationHandleScreen.y) <= ROTATION_HANDLE_RADIUS_PX + 4) {
            return { kind: 'rotate', cursor: "grab" };
        }

        if (isPointInsideBoundingBoxInclusive(localPointer, obbBb)) {
            return { kind: 'move', cursor: "move" };
        }

        return { kind: 'outside', cursor: "" };
    }, [getPointerDocPoint, placementMode, viewOffset.x, viewOffset.y, zoom]);

    /** Enter pending mode: store the shape and draw its overlay. */
    const enterPending = useCallback((shape: Shape, options?: EnterPendingOptions) => {
        resetPendingState();
        onCancelCallbackRef.current  = options?.onCancel  ?? null;
        onConfirmCallbackRef.current = options?.onConfirm ?? null;
        onLockCallbackRef.current    = options?.onLock    ?? null;
        isGroupLockedRef.current     = options?.isGroupLocked ?? false;
        // Capture OBB half-sizes from the initial AABB (angle starts at 0).
        const initBb = getResizeBoundsInDocSpace(shape);
        overlayCenterRef.current = getBoundingBoxCenter(initBb);
        overlayHalfSizeRef.current = { hw: initBb.width / 2, hh: initBb.height / 2 };
        pendingShapeRef.current = shape;
        flushPendingRender();
    }, [flushPendingRender, pendingShapeRef, resetPendingState]);

    /** Commit the pending shape to the scene and clear the overlay. */
    const confirmPending = useCallback(() => {
        const shape = pendingShapeRef.current;
        if (!shape) return;
        const onConfirm = onConfirmCallbackRef.current;
        resetPendingState();
        if (onConfirm) {
            onConfirm();
        } else {
            pushShape(shape);
        }
        renderViewport();
    }, [pendingShapeRef, pushShape, renderViewport, resetPendingState]);

    /** Discard the pending shape and restore the canvas to the committed scene. */
    const cancelPending = useCallback(() => {
        const ctx = contextRef.current;
        const onCancel = onCancelCallbackRef.current;
        resetPendingState();
        onCancel?.();
        if (ctx) {
            redrawFromScene(ctx);
            renderViewport();
        }
    }, [contextRef, redrawFromScene, renderViewport, resetPendingState]);

    /**
     * Handle a pointer-down event while a shape is pending.
     * Returns true if the event was consumed.
     */
    const onPointerDown = useCallback((docPoint: Point, canvasPoint?: Point): boolean => {
        const shape = pendingShapeRef.current;
        if (!shape) return false;
        const hoverTarget = getHoverTarget(shape, docPoint, canvasPoint);

        if (hoverTarget.kind === 'vertex') {
            pendingMode.current = 'vertex';
            vertexIdRef.current = hoverTarget.vertexId;
            dragStart.current = docPoint;
            setCanvasCursor('crosshair');
            return true;
        }

        if (hoverTarget.kind === 'resize') {
            pendingMode.current = 'resize';
            resizeHandleRef.current = hoverTarget.handle;
            const resizeBounds = getResizeBoundsInDocSpace(shape);
            const resizeCenter = getBoundingBoxCenter(resizeBounds);
            const halfSize = overlayHalfSizeRef.current ?? { hw: resizeBounds.width / 2, hh: resizeBounds.height / 2 };
            const resizeBox = {
                x: resizeCenter.x - halfSize.hw,
                y: resizeCenter.y - halfSize.hh,
                width: halfSize.hw * 2,
                height: halfSize.hh * 2,
            };
            resizeBoundsRef.current = resizeBox;
            resizeAnchorRef.current = getHandleAnchorPoint(resizeBox, hoverTarget.handle);
            dragStart.current = docPoint;
            const resizeShapeBox = toShapeBoundingBox(shape, resizeBox);
            shape.beginResize(
                shape.pixelated ? resizeShapeBox : resizeBox,
                overlayAngleRef.current,
                shape.pixelated ? getBoundingBoxCenter(resizeShapeBox) : resizeCenter,
            );
            setCanvasCursor(hoverTarget.cursor);
            return true;
        }

        if (hoverTarget.kind === 'rotate') {
            // Use shape.getCenter() — always in the same coordinate space as docPoint
            // (grid units for pixelated shapes, doc pixels for standard shapes).
            // getResizeBoundsInDocSpace converts pixelated shapes to pixel space,
            // which would mismatch docPoint and break the angle calculation.
            const pivot = shape.getCenter();
            rotatePivotRef.current = pivot;
            rotateStartAngleRef.current = Math.atan2(docPoint.y - pivot.y, docPoint.x - pivot.x) + Math.PI / 2;
            overlayAngleBaseRef.current = overlayAngleRef.current;
            shape.beginRotate();
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
    }, [confirmPending, getHoverTarget, pendingShapeRef, setCanvasCursor]);

    /**
     * Handle pointer-move while in pending mode.
     * Returns true if handled.
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

        if (pendingMode.current === 'vertex' && vertexIdRef.current) {
            const dx = docPoint.x - dragStart.current.x;
            const dy = docPoint.y - dragStart.current.y;
            moveShapeVertex(shape, vertexIdRef.current, dx, dy);
            dragStart.current = docPoint;
            setCanvasCursor('crosshair');
        } else if (pendingMode.current === 'move') {
            shape.moveBy(docPoint.x - dragStart.current.x, docPoint.y - dragStart.current.y);
            dragStart.current = docPoint;
            overlayCenterRef.current = getBoundingBoxCenter(getResizeBoundsInDocSpace(shape));
            setCanvasCursor("grabbing");
        } else if (pendingMode.current === 'rotate') {
            const pivot = rotatePivotRef.current!;
            const currentAngle = Math.atan2(docPoint.y - pivot.y, docPoint.x - pivot.x) + Math.PI / 2;
            const delta = currentAngle - rotateStartAngleRef.current;
            shape.rotateBy(delta, pivot);
            overlayCenterRef.current = getPointerDocPoint(shape, pivot);
            overlayAngleRef.current = overlayAngleBaseRef.current + delta;
            setCanvasCursor("grabbing");
        } else if (pendingMode.current === 'resize' && resizeHandleRef.current && resizeAnchorRef.current && resizeBoundsRef.current) {
            const handle = resizeHandleRef.current;
            const anchor = resizeAnchorRef.current;
            const handleConfig = RESIZE_HANDLE_CONFIG[handle];
            const defaultSigns = getHandleDefaultSigns(handle);
            const resizeCenter = getBoundingBoxCenter(resizeBoundsRef.current);
            const localPointerDocPoint = rotatePointAround(
                getPointerDocPoint(shape, docPoint, canvasPoint),
                resizeCenter,
                -overlayAngleRef.current,
            );
            const dragPoint = shape.pixelated
                ? {
                    x: handleConfig.affectsX
                        ? getPixelatedResizeEdge(localPointerDocPoint.x, anchor.x, defaultSigns.x, shape.pixelSize)
                        : anchor.x,
                    y: handleConfig.affectsY
                        ? getPixelatedResizeEdge(localPointerDocPoint.y, anchor.y, defaultSigns.y, shape.pixelSize)
                        : anchor.y,
                }
                : localPointerDocPoint;

            // Rotation is baked into shapes, so axis is always aligned with the canvas axes.
            const projectedWidth  = dragPoint.x - anchor.x;
            const projectedHeight = dragPoint.y - anchor.y;
            const widthSign = handleConfig.affectsX
                ? resolveResizeAxisSign(projectedWidth, defaultSigns.x)
                : 0;
            const heightSign = handleConfig.affectsY
                ? resolveResizeAxisSign(projectedHeight, defaultSigns.y)
                : 0;
            const resizeOptions: ResizeOptions = {
                flipX: handleConfig.affectsX && widthSign !== 0 && widthSign !== defaultSigns.x,
                flipY: handleConfig.affectsY && heightSign !== 0 && heightSign !== defaultSigns.y,
            };
            let width = handleConfig.affectsX ? Math.abs(projectedWidth) : resizeBoundsRef.current.width;
            let height = handleConfig.affectsY ? Math.abs(projectedHeight) : resizeBoundsRef.current.height;
            let center = {
                x: handleConfig.affectsX ? anchor.x + projectedWidth / 2 : anchor.x,
                y: handleConfig.affectsY ? anchor.y + projectedHeight / 2 : anchor.y,
            };

            if (shape.kind === 'square' || shape.kind === 'circle') {
                if (handleConfig.affectsX && handleConfig.affectsY) {
                    const size = Math.max(Math.abs(projectedWidth), Math.abs(projectedHeight));
                    width = size;
                    height = size;
                    center = {
                        x: anchor.x + (widthSign * size) / 2,
                        y: anchor.y + (heightSign * size) / 2,
                    };
                } else if (handleConfig.affectsX) {
                    const size = Math.abs(projectedWidth);
                    width = size;
                    height = size;
                    center = {
                        x: anchor.x + (widthSign * size) / 2,
                        y: anchor.y,
                    };
                } else if (handleConfig.affectsY) {
                    const size = Math.abs(projectedHeight);
                    width = size;
                    height = size;
                    center = {
                        x: anchor.x,
                        y: anchor.y + (heightSign * size) / 2,
                    };
                }
            }

            // Rotation is baked into shapes, so axes are aligned with canvas axes.
            const docBounds = normalizeBoundingBox(
                { x: center.x - width / 2, y: center.y - height / 2 },
                { x: center.x + width / 2, y: center.y + height / 2 },
            );

            shape.resizeToBoundingBox(toShapeBoundingBox(shape, docBounds), resizeOptions);
            overlayCenterRef.current = rotatePointAround(
                getBoundingBoxCenter(docBounds),
                resizeCenter,
                overlayAngleRef.current,
            );
            overlayHalfSizeRef.current = { hw: docBounds.width / 2, hh: docBounds.height / 2 };
            setCanvasCursor(getResizeCursor(handle, overlayAngleRef.current));
        }

        schedulePendingRender();
        return true;
    }, [contextRef, getHoverTarget, getPointerDocPoint, pendingShapeRef, schedulePendingRender, setCanvasCursor]);

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
            vertexIdRef.current = null;
            if (activeMode === 'resize') {
                shape?.endResize();
            }
            if (activeMode === 'rotate') { shape?.endRotate(); rotatePivotRef.current = null; }
            if (activeMode === 'vertex') {
                setCanvasCursor('crosshair');
            } else if (activeMode === 'resize' && activeHandle) {
                setCanvasCursor(getResizeCursor(activeHandle, overlayAngleRef.current));
            } else if (activeMode === 'move') {
                setCanvasCursor("move");
            } else if (activeMode === 'rotate') {
                setCanvasCursor("grab");
            }
            return true;
        }
        return false;
    }, [flushPendingRender, pendingShapeRef, setCanvasCursor]);

    /** Called by the HTML lock button's onClick to group/ungroup the pending ShapeGroup. */
    const handleLockClick = useCallback(() => {
        const onLock = onLockCallbackRef.current;
        const ctx = contextRef.current;
        resetPendingState();
        onLock?.();
        if (ctx) {
            redrawFromScene(ctx);
            renderViewport();
        }
    }, [contextRef, redrawFromScene, renderViewport, resetPendingState]);

    return {
        enterPending,
        confirmPending,
        cancelPending,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        lockButtonRef,
        handleLockClick,
    };
};

export default usePendingPlacement;
