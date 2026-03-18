import { useCallback, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PaintContext } from "../context/PaintContext";
import { ReplacementContext } from "../context/ReplacementContext";
import { SettingsContext } from "../context/SettingsContext";
import type { BoundingBox } from "../shapes/ShapeTypes";
import {
    getInclusivePixelBoundingBox,
    isPointInsideBoundingBoxInclusive,
    moveBoundingBox,
} from "../utils/boundingBox";
import {
    clipSceneItemsToPixelBounds,
    createPixelBoundsFromDocPoints,
    type PixelClipShape,
} from "../utils/pixelClipping";
import type { SceneItem } from "./useScene";
import type { Point } from "../../../functions/geometry";

// ─── Types ───────────────────────────────────────────────────────────────────

type SelectionInput = {
    sceneRef: RefObject<SceneItem[]>;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    pushShape: (shape: SceneItem) => void;
    takeSnapshotShape: (ctx: CanvasRenderingContext2D) => SceneItem;
};

type SelectionPhase = 'idle' | 'drawing' | 'floating';

/** Floating state for standard (raster) mode. */
type StandardFloat = {
    kind: 'standard';
    imageData: ImageData;
    /** Current top-left of the floating image in doc-space pixels. */
    x: number;
    y: number;
    /** Size of the floating image in doc-space pixels. */
    w: number;
    h: number;
};

/** Floating state for pixelated mode (line or polygon clip). */
type PixelFloat = {
    kind: 'pixel';
    shapes: PixelClipShape[];
    keepInScene: SceneItem[];
    /** Bounding box in grid units, using the same inclusive convention as pending placement. */
    bounds: BoundingBox;
};

type FloatState = StandardFloat | PixelFloat;

// ─── Replay helper (mirrors redrawFromScene but on an arbitrary item list) ──

function replayItems(ctx: CanvasRenderingContext2D, items: SceneItem[]): void {
    let startIdx = 0;
    let found = false;
    for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].isCheckpoint()) { startIdx = i; found = true; break; }
    }
    if (!found) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i = startIdx; i < items.length; i++) items[i].draw(ctx);
}

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

const useSelection = ({ sceneRef, redrawFromScene, pushShape, takeSnapshotShape }: SelectionInput) => {
    const { contextRef, pixelated, viewOffset, zoom, renderViewport, selectionItemRef } = useContext(PaintContext)!;
    const { pixelSize, clipAlgorithm } = useContext(SettingsContext)!;
    const { replacementContextRef } = useContext(ReplacementContext)!;

    const phase       = useRef<SelectionPhase>('idle');
    const selStart    = useRef<Point | null>(null);
    const selEnd      = useRef<Point | null>(null);
    const floatState  = useRef<FloatState | null>(null);
    const dragStart   = useRef<Point | null>(null);
    /** Snapshot of sceneRef at floating-entry time, used for cancel/commit. */
    const savedScene  = useRef<SceneItem[]>([]);

    // ── Snap helper ────────────────────────────────────────────────────────────

    const snap = useCallback((v: number) =>
        pixelated ? Math.floor(v / pixelSize) * pixelSize : v,
    [pixelated, pixelSize]);

    // ── Overlay: draw selection border (called after renderViewport) ───────────

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

    // ── Overlay: draw standard floating image + border ─────────────────────────

    const drawStandardFloatOverlay = useCallback((fs: StandardFloat) => {
        const overlay = replacementContextRef.current;
        if (!overlay) return;

        const tmp = document.createElement('canvas');
        tmp.width  = fs.w;
        tmp.height = fs.h;
        tmp.getContext('2d')?.putImageData(fs.imageData, 0, 0);

        overlay.save();
        applyViewportTransform(overlay, zoom, viewOffset);
        overlay.drawImage(tmp, fs.x, fs.y, fs.w, fs.h);
        drawDashedRect(overlay, zoom, fs.x, fs.y, fs.w, fs.h);
        overlay.restore();
    }, [replacementContextRef, zoom, viewOffset]);

    const drawPixelFloatOverlay = useCallback((bounds: BoundingBox) => {
        const rect = getInclusivePixelBoundingBox(bounds, pixelSize);
        drawSelectionOverlay(rect.x, rect.y, rect.width, rect.height);
    }, [drawSelectionOverlay, pixelSize]);

    // ── Keep SelectionOverlayItem in sync when zoom/viewOffset change ──────────
    // The draw callbacks above capture zoom/viewOffset in their closures and are
    // recreated whenever those values change. This effect re-registers the redraw
    // function so renderViewport() always uses the latest transforms on resize.
    useEffect(() => {
        const item = selectionItemRef.current;
        const p = phase.current;
        if (p === 'idle') return;

        if (p === 'drawing') {
            const s = selStart.current;
            const e = selEnd.current;
            if (!s || !e) return;
            if (pixelated) {
                const bounds = createPixelBoundsFromDocPoints(s, e, pixelSize);
                const rect = getInclusivePixelBoundingBox(bounds, pixelSize);
                item.update(() => drawSelectionOverlay(rect.x, rect.y, rect.width, rect.height));
            } else {
                const sx = Math.min(s.x, e.x);
                const sy = Math.min(s.y, e.y);
                const w  = Math.abs(e.x - s.x);
                const h  = Math.abs(e.y - s.y);
                item.update(() => drawSelectionOverlay(sx, sy, w, h));
            }
            return;
        }

        // floating
        const fs = floatState.current;
        if (!fs) return;
        if (fs.kind === 'standard') {
            item.update(() => drawStandardFloatOverlay(fs));
        } else {
            item.update(() => drawPixelFloatOverlay(fs.bounds));
        }
    }, [selectionItemRef, pixelated, pixelSize, drawSelectionOverlay, drawStandardFloatOverlay, drawPixelFloatOverlay]);

    // ── Enter floating for STANDARD mode ──────────────────────────────────────

    const enterStandardFloat = useCallback((
        ctx: CanvasRenderingContext2D,
        sx: number, sy: number, sw: number, sh: number,
    ) => {
        const imageData = ctx.getImageData(sx, sy, sw, sh);
        ctx.clearRect(sx, sy, sw, sh);

        const fs: StandardFloat = { kind: 'standard', imageData, x: sx, y: sy, w: sw, h: sh };
        floatState.current = fs;
        phase.current      = 'floating';

        pushShape(takeSnapshotShape(ctx)); // "hole" checkpoint for undo
        selectionItemRef.current.update(() => drawStandardFloatOverlay(fs));
        renderViewport();
    }, [pushShape, takeSnapshotShape, renderViewport, drawStandardFloatOverlay, selectionItemRef]);

    // ── Enter floating for PIXELATED mode ─────────────────────────────────────

    const enterPixelFloat = useCallback((
        ctx: CanvasRenderingContext2D,
        selectionBounds: BoundingBox,
    ) => {
        const { floatingShapes, keepInScene, floatingBounds } = clipSceneItemsToPixelBounds({
            scene: sceneRef.current,
            clipAlgorithm,
            bounds: selectionBounds,
        });

        if (floatingShapes.length === 0 || !floatingBounds) {
            // Nothing to float — just clear selection overlay
            phase.current = 'idle';
            selectionItemRef.current.update(null);
            renderViewport();
            return;
        }

        const pf: PixelFloat = {
            kind: 'pixel',
            shapes: floatingShapes,
            keepInScene,
            bounds: floatingBounds,
        };
        floatState.current = pf;
        phase.current = 'floating';

        // Draw scene without floating shapes
        replayItems(ctx, keepInScene);
        pushShape(takeSnapshotShape(ctx)); // "hole" checkpoint for undo

        // Draw floating shapes at their initial position
        for (const s of floatingShapes) s.draw(ctx);
        selectionItemRef.current.update(() => drawPixelFloatOverlay(floatingBounds));
        renderViewport();
    }, [sceneRef, clipAlgorithm, pushShape, takeSnapshotShape, renderViewport, drawPixelFloatOverlay, selectionItemRef]);

    // ── commitFloating ─────────────────────────────────────────────────────────

    const commitFloating = useCallback(() => {
        const ctx = contextRef.current;
        const fs  = floatState.current;
        if (!ctx || !fs) return;

        if (fs.kind === 'standard') {
            redrawFromScene(ctx);                               // restore hole state
            ctx.putImageData(fs.imageData, fs.x, fs.y);        // stamp at final pos
        } else {
            // Restore original scene for undo chain, then draw committed state
            sceneRef.current = [...savedScene.current];
            replayItems(ctx, fs.keepInScene);
            for (const s of fs.shapes) s.draw(ctx);            // at final positions
        }

        pushShape(takeSnapshotShape(ctx));
        floatState.current = null;
        dragStart.current  = null;
        phase.current      = 'idle';
        selectionItemRef.current.update(null);
        renderViewport();
    }, [contextRef, redrawFromScene, sceneRef, pushShape, takeSnapshotShape, renderViewport, selectionItemRef]);

    // ── cancelFloating ────────────────────────────────────────────────────────

    const cancelFloating = useCallback(() => {
        const ctx = contextRef.current;
        if (!ctx) return;

        // Restore scene and canvas to the state before the cut
        sceneRef.current = [...savedScene.current];
        redrawFromScene(ctx);
        floatState.current = null;
        dragStart.current  = null;
        phase.current      = 'idle';
        selectionItemRef.current.update(null);
        renderViewport();
    }, [contextRef, sceneRef, redrawFromScene, renderViewport, selectionItemRef]);

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
        if (!ctx || !selStart.current || !selEnd.current) {
            phase.current = 'idle';
            selectionItemRef.current.update(null);
            renderViewport();
            return;
        }

        const startPoint = selStart.current;
        const endPoint = selEnd.current;

        selStart.current = null;
        selEnd.current   = null;

        // Save scene before any modification (needed for cancel and commit)
        savedScene.current = [...sceneRef.current];

        if (pixelated) {
            const selectionBounds = createPixelBoundsFromDocPoints(startPoint, endPoint, pixelSize);
            if (selectionBounds.width === 0 && selectionBounds.height === 0) {
                phase.current = 'idle';
                selectionItemRef.current.update(null);
                renderViewport();
                return;
            }

            enterPixelFloat(ctx, selectionBounds);
        } else {
            const sx = Math.min(startPoint.x, endPoint.x);
            const sy = Math.min(startPoint.y, endPoint.y);
            const sw = Math.abs(endPoint.x - startPoint.x);
            const sh = Math.abs(endPoint.y - startPoint.y);

            if (sw < 2 || sh < 2) {
                phase.current = 'idle';
                selectionItemRef.current.update(null);
                renderViewport();
                return;
            }

            enterStandardFloat(ctx, sx, sy, sw, sh);
        }
    }, [contextRef, sceneRef, pixelated, pixelSize, renderViewport, enterPixelFloat, enterStandardFloat]);

    // ── Floating phase pointer events ──────────────────────────────────────────

    /** Returns true if the given doc-space point is inside the floating rect. */
    const isInsideFloat = (p: Point): boolean => {
        const fs = floatState.current;
        if (!fs) return false;
        if (fs.kind === 'standard') {
            return p.x >= fs.x && p.x <= fs.x + fs.w && p.y >= fs.y && p.y <= fs.y + fs.h;
        }

        return isPointInsideBoundingBoxInclusive(p, fs.bounds);
    };

    const onPointerDown = useCallback((docPoint: Point): boolean => {
        if (phase.current !== 'floating') return false;
        if (isInsideFloat(docPoint)) {
            dragStart.current = docPoint;
        } else {
            commitFloating();
        }
        return true;
    }, [commitFloating]);

    const onPointerMove = useCallback((docPoint: Point): boolean => {
        if (phase.current !== 'floating' || !dragStart.current) return false;
        const ctx = contextRef.current;
        if (!ctx) return false;

        const fs = floatState.current;
        if (!fs) return false;

        if (fs.kind === 'standard') {
            const dx = docPoint.x - dragStart.current.x;
            const dy = docPoint.y - dragStart.current.y;
            fs.x += dx;
            fs.y += dy;
            dragStart.current = docPoint;
            redrawFromScene(ctx); // restore hole
            selectionItemRef.current.update(() => drawStandardFloatOverlay(fs));
            renderViewport();
        } else {
            // Pixelated: docPoint is already in grid units (mapped by caller)
            const dx = docPoint.x - dragStart.current.x;
            const dy = docPoint.y - dragStart.current.y;
            dragStart.current = docPoint;
            for (const s of fs.shapes) s.moveBy(dx, dy);
            fs.bounds = moveBoundingBox(fs.bounds, dx, dy);
            replayItems(ctx, fs.keepInScene);
            for (const s of fs.shapes) s.draw(ctx);
            selectionItemRef.current.update(() => drawPixelFloatOverlay(fs.bounds));
            renderViewport();
        }

        return true;
    }, [contextRef, redrawFromScene, renderViewport, drawStandardFloatOverlay, drawPixelFloatOverlay, selectionItemRef]);

    const onPointerUp = useCallback((): boolean => {
        if (phase.current !== 'floating') return false;
        dragStart.current = null; // end drag; shape stays floating
        return true;
    }, []);

    const hasFloating = () => phase.current === 'floating';

    return {
        startSelection,
        updateSelection,
        stopSelection,
        hasFloating,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        cancelSelection: cancelFloating,
        commitSelection: commitFloating,
    };
};

export default useSelection;
