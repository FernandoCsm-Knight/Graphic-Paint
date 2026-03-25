import React, { useCallback, useContext, useRef } from "react";
import type { PointerEvent } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { DASH_ARRAYS, SettingsContext } from "../_context/SettingsContext";
import { Shape } from "../_shapes/ShapeTypes"; // needed for enterPendingShape cast
import generator from "../_types/ShapeGenerator";
import FreeForm from "../_shapes/FreeForm";
import FillShape from "../_shapes/FillShape";

import { map } from "../_types/Graphics";
import useWorkspacePanZoom from "@/hooks/useWorkspacePanZoom";
import useSelection from "./useSelection";
import useMultiSelect from "./useMultiSelect";
import usePolygonDrawing from "./usePolygonDrawing";
import usePendingPlacement from "./usePendingPlacement";
import type { SceneItem } from "./useScene";
import type { Point } from "@/types/geometry";

type DrawingHandlersInput = {
    renderViewport: () => void;
    getViewportSize: () => { width: number; height: number };
    clampViewOffset: (next: Point, viewportWidth?: number, viewportHeight?: number, canvasWidth?: number, canvasHeight?: number, zoomLevel?: number) => Point;
    getMinAllowedZoom: (viewportWidth?: number, viewportHeight?: number, canvasWidth?: number, canvasHeight?: number) => number;
    sceneRef: React.RefObject<SceneItem[]>;
    pushShape: (shape: SceneItem) => void;
    replaceScene: (scene: SceneItem[]) => void;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
};

const useDrawingHandlers = ({
    renderViewport,
    getViewportSize,
    clampViewOffset,
    getMinAllowedZoom,
    sceneRef,
    pushShape,
    replaceScene,
    redrawFromScene,
}: DrawingHandlersInput) => {
    const {
        canvasRef,
        contextRef,
        thicknessRef,
        currentColorRef,
        isEraserActive,
        isFillActive,
        isSelectionActive,
        pixelated,
        selectedShape,
        pendingShapeRef,
    } = useContext(PaintContext)!;

    const {
        containerRef,
        viewOffset,
        setViewOffset,
        zoom,
        setZoom,
        worldSize,
        setWorldSize,
        setCanvasPanning,
        isPanModeActive,
    } = useWorkspaceContext();

    const { pixelSize, lineAlgorithm, lineDashPreset, brushStyle } = useContext(SettingsContext)!;
    const lineDash = DASH_ARRAYS[lineDashPreset];;

    // usePendingPlacement must come before useSelection so enterPendingShape
    // can be forwarded into the selection hook.
    const pending = usePendingPlacement({ renderViewport, redrawFromScene, pushShape });
    const {
        onPointerDown: pendingPointerDown,
        onPointerMove: pendingPointerMove,
        onPointerUp: pendingPointerUp,
        enterPending: enterPendingShape,
        confirmPending: confirmPendingShape,
        cancelPending: cancelPendingShape,
        lockButtonRef,
        handleLockClick,
    } = pending;

    const { startSelection, updateSelection, stopSelection } = useSelection({
        sceneRef,
        pushShape,
        replaceScene,
        enterPendingShape,
    });

    const { startMultiSelect, updateMultiSelect, stopMultiSelect } = useMultiSelect({
        sceneRef,
        redrawFromScene,
        pushShape,
        replaceScene,
        enterPendingShape,
    });

    const { onPointerDown: panDown, onPointerMove: panMove, onPointerUp: panUp, handleWheel } = useWorkspacePanZoom({
        interactionRef: canvasRef,
        containerRef,
        viewOffset,
        setViewOffset,
        zoom,
        setZoom,
        worldSize,
        setWorldSize,
        setIsPanning: setCanvasPanning,
        isPanModeActive,
        getViewportSize,
        clampViewOffset,
        getMinAllowedZoom,
    });

    const polygon = usePolygonDrawing({
        contextRef,
        renderViewport,
        redrawFromScene,
        enterPending: enterPendingShape,
        currentColorRef,
        thicknessRef,
        pixelated,
        pixelSize,
        lineAlgorithm,
        selectedShape,
    });

    const hasPendingShape = useCallback(() => pendingShapeRef.current !== null, [pendingShapeRef]);

    const isDrawing = useRef(false);
    const isRightDragging = useRef(false);
    const start = useRef<Point>({ x: 0, y: 0 });
    const currentShape = useRef<SceneItem | null>(null);
    const rafId = useRef<number | null>(null);
    const pendingPoint = useRef<Point | null>(null);

    /** Throttles shape preview redraws to one per animation frame. */
    const scheduleShapePreview = useCallback((point: Point, ctx: CanvasRenderingContext2D) => {
        pendingPoint.current = point;
        if (rafId.current !== null) return;
        rafId.current = requestAnimationFrame(() => {
            rafId.current = null;
            if (!pendingPoint.current) return;
            redrawFromScene(ctx);
                const shape = generator({
                    start: start.current,
                    end: pendingPoint.current,
                    color: currentColorRef.current,
                    thickness: thicknessRef.current,
                    kind: selectedShape,
                    pixelated,
                    pixelSize,
                lineAlgorithm,
                lineDash,
            });
            currentShape.current = shape;
            shape.draw(ctx);
            renderViewport();
        });
    }, [redrawFromScene, currentColorRef, thicknessRef, selectedShape, pixelated, pixelSize, lineAlgorithm, lineDash, renderViewport]);

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

        // Right-click: start multi-shape selection whenever no shape is pending.
        if (e.button === 2) {
            if (!hasPendingShape()) {
                const point = getCanvasPoint(e);
                if (point) {
                    isRightDragging.current = true;
                    canvasRef.current?.setPointerCapture(e.pointerId);
                    startMultiSelect(point);
                }
            }
            return;
        }

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
        if (hasPendingShape()) {
            pendingPointerDown(mappedPoint, point);
        } else if (selectedShape === 'polygon') {
            polygon.onPointerDown(mappedPoint);
        } else {
            canvas.setPointerCapture(e.pointerId);
            isDrawing.current = true;
            start.current = mappedPoint;

            if (isSelectionActive) {
                startSelection({ x, y });
            } else if (isFillActive) {
                const fillShape = new FillShape({
                    point: start.current,
                    strokeStyle: currentColorRef.current,
                    isEraser: isEraserActive,
                    pixelated,
                    pixelSize,
                });
                fillShape.draw(ctx);
                currentShape.current = fillShape;
                renderViewport();
            } else if (selectedShape === 'freeform') {
                const form = new FreeForm([start.current], {
                    strokeStyle: currentColorRef.current,
                    lineWidth: thicknessRef.current,
                    isEraser: isEraserActive,
                    filled: isFillActive,
                    pixelated,
                    pixelSize,
                    lineAlgorithm,
                    lineDash,
                    brushStyle,
                });
                if (lineDash.length > 0 && !pixelated) form.beginStroke(ctx);
                form.draw(ctx);
                currentShape.current = form;
                renderViewport();
            }
        }
    }, [
        panDown, canvasRef, contextRef, getCanvasPoint, pixelated, pixelSize,
        isSelectionActive, startSelection, startMultiSelect, isFillActive, currentColorRef, isEraserActive,
        selectedShape, thicknessRef, lineAlgorithm, lineDash, brushStyle, renderViewport, polygon,
        hasPendingShape, pendingPointerDown,
    ]);

    const handlePointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if (panMove(e)) return;

        const currentPoint = getCanvasPoint(e);
        if (!currentPoint) return;

        const { x, y } = currentPoint;
        const point = pixelated ? map({ x, y }, pixelSize) : { x, y };

        if (isRightDragging.current) {
            updateMultiSelect(currentPoint);
            return;
        }

        // Pending placement takes priority over all tool-specific move handling
        if (hasPendingShape()) {
            pendingPointerMove(point, currentPoint);
        } else if (selectedShape === 'polygon') {
            polygon.onPointerMove(point);
        } else if (isDrawing.current && contextRef.current) {
            const ctx = contextRef.current;

            if (isSelectionActive) {
                updateSelection({ x, y });
            } else if (selectedShape === 'freeform') {
                if (currentShape.current instanceof FreeForm) {
                    currentShape.current.lineTo(point, ctx);
                    renderViewport();
                }
            } else {
                scheduleShapePreview(point, ctx);
            }
        }
    }, [
        panMove, contextRef, getCanvasPoint, pixelated, pixelSize,
        isSelectionActive, updateSelection, updateMultiSelect, selectedShape,
        scheduleShapePreview, renderViewport, polygon,
        hasPendingShape, pendingPointerMove,
    ]);

    const handlePointerUp = useCallback((e?: PointerEvent<HTMLCanvasElement>) => {
        if (isRightDragging.current) {
            isRightDragging.current = false;
            if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
            stopMultiSelect();
            return;
        }

        if (panUp(e)) return;

        if (!pendingPointerUp() && selectedShape !== 'polygon' && isDrawing.current) {
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }

            const ctx = contextRef.current;

            if (isSelectionActive) {
                stopSelection();
            } else if (currentShape.current && ctx) {
                const shape = currentShape.current;
                if (shape.requiresSnapshot()) {
                    // FreeForm / FillShape: self-snapshot then commit directly to scene
                    shape.captureSnapshot(ctx);
                    pushShape(shape);
                    renderViewport();
                } else {
                    // Geometric shapes enter pending placement for optional move/rotate
                    enterPendingShape(shape as Shape);
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
    }, [
        panUp,
        selectedShape,
        contextRef,
        isSelectionActive,
        renderViewport,
        pushShape,
        stopSelection,
        stopMultiSelect,
        pendingPointerUp,
        enterPendingShape,
    ]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
        enterPendingShape,
        confirmPendingShape,
        cancelPendingShape,
        lockButtonRef,
        handleLockClick,
    };
};

export default useDrawingHandlers;
