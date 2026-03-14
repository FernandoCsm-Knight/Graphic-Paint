import { useCallback, useContext, useRef } from "react";
import type { PointerEvent } from "react";
import { PaintContext } from "../context/PaintContext";
import { SettingsContext } from "../context/SettingsContext";
import { Shape } from "../shapes/ShapeTypes";
import generator from "../types/ShapeGenerator";
import FreeForm from "../shapes/FreeForm";
import FillShape from "../shapes/FillShape";
import SnapshotShape from "../shapes/SnapshotShape";
import { map } from "../types/Graphics";
import useSelection from "./useSelection";
import usePanZoom from "./usePanZoom";
import usePolygonDrawing from "./usePolygonDrawing";
import usePendingPlacement from "./usePendingPlacement";
import type { SceneItem } from "./useScene";
import type { Point } from "../../../functions/geometry";

type DrawingHandlersInput = {
    renderViewport: () => void;
    getViewportSize: () => { width: number; height: number };
    clampViewOffset: (next: Point, viewportWidth?: number, viewportHeight?: number, canvasWidth?: number, canvasHeight?: number, zoomLevel?: number) => Point;
    getMinAllowedZoom: (viewportWidth?: number, viewportHeight?: number, canvasWidth?: number, canvasHeight?: number) => number;
    pushShape: (shape: SceneItem) => void;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    takeSnapshotShape: (ctx: CanvasRenderingContext2D) => SnapshotShape;
};

const useDrawingHandlers = ({
    renderViewport,
    getViewportSize,
    clampViewOffset,
    getMinAllowedZoom,
    pushShape,
    redrawFromScene,
    takeSnapshotShape,
}: DrawingHandlersInput) => {
    const {
        canvasRef,
        contextRef,
        thickness,
        currentColor,
        isEraserActive,
        isFillActive,
        isSelectionActive,
        pixelated,
        selectedShape,
        viewOffset,
        zoom,
    } = useContext(PaintContext)!;

    const { pixelSize, lineAlgorithm } = useContext(SettingsContext)!;

    const { startSelection, updateSelection, stopSelection } = useSelection();
    const { onPointerDown: panDown, onPointerMove: panMove, onPointerUp: panUp, handleWheel } = usePanZoom({
        getViewportSize,
        clampViewOffset,
        getMinAllowedZoom,
    });

    const pending = usePendingPlacement({ renderViewport, redrawFromScene, pushShape });

    const polygon = usePolygonDrawing({
        contextRef,
        renderViewport,
        redrawFromScene,
        enterPending: pending.enterPending,
        currentColor,
        thickness,
        pixelated,
        pixelSize,
        lineAlgorithm,
        selectedShape,
    });

    const isDrawing = useRef(false);
    const start = useRef<Point>({ x: 0, y: 0 });
    const currentShape = useRef<Shape | null>(null);
    const rafId = useRef<number | null>(null);
    const pendingPoint = useRef<Point | null>(null);

    const getCanvasPoint = useCallback((e: PointerEvent<HTMLCanvasElement>): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - viewOffset.x) / zoom,
            y: (e.clientY - rect.top - viewOffset.y) / zoom,
        };
    }, [canvasRef, viewOffset.x, viewOffset.y, zoom]);

    const handlePointerDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if (panDown(e)) return;
        if (e.button !== 0) return;

        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        const point = getCanvasPoint(e);
        if (!point) return;

        const { x, y } = point;
        const mappedPoint = pixelated ? map({ x, y }, pixelSize) : { x, y };

        // While a shape is pending confirmation, all clicks are handled by the
        // pending placement logic (move drag, rotate drag, or confirm on outside click).
        if (pending.hasPending()) {
            pending.onPointerDown(mappedPoint);
            return;
        }

        if (selectedShape === 'polygon') {
            polygon.onPointerDown(mappedPoint);
            return;
        }

        canvas.setPointerCapture(e.pointerId);
        isDrawing.current = true;
        start.current = mappedPoint;

        if (isSelectionActive) {
            startSelection({ x, y });
        } else if (isFillActive) {
            const fillShape = new FillShape({
                point: start.current,
                strokeStyle: currentColor.current,
                isEraser: isEraserActive,
                pixelated,
                pixelSize,
            });
            fillShape.draw(ctx);
            currentShape.current = fillShape;
            renderViewport();
        } else if (selectedShape === 'freeform') {
            const form = new FreeForm([start.current], {
                strokeStyle: currentColor.current,
                lineWidth: thickness.current,
                isEraser: isEraserActive,
                filled: isFillActive,
                pixelated,
                pixelSize,
                lineAlgorithm,
            });
            form.draw(ctx);
            currentShape.current = form;
            renderViewport();
        }
    }, [
        panDown, canvasRef, contextRef, getCanvasPoint, pixelated, pixelSize,
        isSelectionActive, startSelection, isFillActive, currentColor, isEraserActive,
        selectedShape, thickness, lineAlgorithm, renderViewport, polygon,
    ]);

    const handlePointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if (panMove(e)) return;

        const currentPoint = getCanvasPoint(e);
        if (!currentPoint) return;

        const { x, y } = currentPoint;
        const point = pixelated ? map({ x, y }, pixelSize) : { x, y };

        // Pending placement takes priority over all tool-specific move handling
        if (pending.hasPending()) {
            pending.onPointerMove(point);
            return;
        }

        if (selectedShape === 'polygon') {
            polygon.onPointerMove(point);
            return;
        }

        if (!isDrawing.current) return;

        const ctx = contextRef.current;
        if (!ctx) return;

        if (isSelectionActive) {
            updateSelection({ x, y });
            return;
        }

        if (selectedShape === 'freeform') {
            if (currentShape.current instanceof FreeForm) {
                currentShape.current.lineTo(point, ctx);
                renderViewport();
            }
            return;
        }

        pendingPoint.current = point;
        if (rafId.current === null) {
            rafId.current = requestAnimationFrame(() => {
                rafId.current = null;
                if (!pendingPoint.current) return;

                redrawFromScene(ctx);

                const shape = generator({
                    start: start.current,
                    end: pendingPoint.current,
                    color: currentColor.current,
                    thickness: thickness.current,
                    kind: selectedShape,
                    pixelated,
                    pixelSize,
                    lineAlgorithm,
                });

                currentShape.current = shape;
                shape.draw(ctx);
                renderViewport();
            });
        }
    }, [
        panMove, contextRef, getCanvasPoint, pixelated, pixelSize,
        isSelectionActive, updateSelection, selectedShape, redrawFromScene,
        currentColor, thickness, lineAlgorithm, renderViewport, polygon,
    ]);

    const handlePointerUp = useCallback((e?: PointerEvent<HTMLCanvasElement>) => {
        if (panUp(e)) return;

        // End an active move/rotate drag on a pending shape (shape stays pending).
        // Must be checked before the polygon guard so that releasing a drag on a
        // pending FreePolygon correctly ends the drag.
        if (pending.onPointerUp()) {
            if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
            return;
        }

        if (selectedShape === 'polygon') return;

        if (isDrawing.current) {
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }

            const ctx = contextRef.current;

            if (isSelectionActive) {
                stopSelection();
            } else if (currentShape.current && ctx) {
                if (currentShape.current instanceof FreeForm || currentShape.current instanceof FillShape) {
                    // Expensive operations go straight to scene as a snapshot
                    pushShape(takeSnapshotShape(ctx));
                    renderViewport();
                } else {
                    // Regular shapes enter pending placement for optional move/rotate
                    pending.enterPending(currentShape.current);
                }
            }

            isDrawing.current = false;
            currentShape.current = null;
            if (ctx) {
                ctx.beginPath();
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, [panUp, selectedShape, contextRef, isSelectionActive, renderViewport, pushShape, takeSnapshotShape, stopSelection, pending]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
    };
};

export default useDrawingHandlers;
