import { useCallback, useContext, useEffect, useRef } from "react";
import { PaintContext } from "../context/PaintContext";
import { ReplacementContext } from "../context/ReplacementContext";
import { SettingsContext } from "../context/SettingsContext";
import useWorkspaceViewport from "../../../hooks/useWorkspaceViewport";
import { drawGrid, getGridCellSize } from "../../../utils/workspaceGrid";
import { ClipboardImageLoader } from "../utils/ClipboardImageLoader";
import ImageShape from "../shapes/ImageShape";
import useDrawingHandlers from "./useDrawingHandlers";
import useScene from "./useScene";

const MIN_CANVAS_WIDTH = 2400;
const MIN_CANVAS_HEIGHT = 1600;
const CANVAS_SCALE_FACTOR = 2;

const useCanvas = () => {
    const documentCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const {
        canvasRef,
        containerRef,
        contextRef,
        canvasSize,
        viewOffset,
        zoom,
        pixelated,
        setViewOffset,
        setRenderViewport,
        pendingShapeRef,
        redrawPendingOverlay,
    } = useContext(PaintContext)!;

    const { replacementCanvasRef, replacementContextRef } = useContext(ReplacementContext)!;
    const { pixelSize, gridDisplayMode } = useContext(SettingsContext)!;

    const { sceneRef, pushShape, undoScene, redoScene, redrawFromScene, takeSnapshotShape } = useScene();

    const viewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const overlayViewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    const { getViewportSize, clampViewOffset, getMinAllowedZoom } = useWorkspaceViewport({
        containerRef,
        zoom,
        getWorldSize: () => ({
            width: documentCanvasRef.current?.width ?? 0,
            height: documentCanvasRef.current?.height ?? 0,
        }),
    });

    const resizeViewportCanvas = useCallback((canvas: HTMLCanvasElement, width: number, height: number) => {
        const dpr = window.devicePixelRatio || 1;
        const bitmapWidth = Math.max(1, Math.floor(width * dpr));
        const bitmapHeight = Math.max(1, Math.floor(height * dpr));
        if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
        if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }, []);

    const renderViewport = useCallback(() => {
        const documentCanvas = documentCanvasRef.current;
        const viewportCanvas = canvasRef.current;
        const overlayCanvas = replacementCanvasRef.current;
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();

        if (!documentCanvas || !viewportCanvas || !overlayCanvas || viewportWidth <= 0 || viewportHeight <= 0) {
            return;
        }

        resizeViewportCanvas(viewportCanvas, viewportWidth, viewportHeight);
        resizeViewportCanvas(overlayCanvas, viewportWidth, viewportHeight);

        if (!viewportCtxRef.current || viewportCtxRef.current.canvas !== viewportCanvas) {
            viewportCtxRef.current = viewportCanvas.getContext("2d", { alpha: true }) ?? null;
        }
        if (!overlayViewportCtxRef.current || overlayViewportCtxRef.current.canvas !== overlayCanvas) {
            overlayViewportCtxRef.current = overlayCanvas.getContext("2d", { alpha: true }) ?? null;
        }

        const viewportCtx = viewportCtxRef.current;
        const overlayViewportCtx = overlayViewportCtxRef.current;
        if (!viewportCtx || !overlayViewportCtx) return;

        const dpr = window.devicePixelRatio || 1;
        const offsetX = viewOffset.x;
        const offsetY = viewOffset.y;
        const sourceWidth = Math.min(documentCanvas.width, viewportWidth / zoom);
        const sourceHeight = Math.min(documentCanvas.height, viewportHeight / zoom);
        const maxSourceX = Math.max(0, documentCanvas.width - sourceWidth);
        const maxSourceY = Math.max(0, documentCanvas.height - sourceHeight);
        const sourceX = Math.min(maxSourceX, Math.max(0, -offsetX / zoom));
        const sourceY = Math.min(maxSourceY, Math.max(0, -offsetY / zoom));

        viewportCtx.setTransform(1, 0, 0, 1, 0, 0);
        viewportCtx.clearRect(0, 0, viewportCtx.canvas.width, viewportCtx.canvas.height);
        viewportCtx.imageSmoothingEnabled = false;
        viewportCtx.save();
        viewportCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        viewportCtx.drawImage(documentCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, viewportWidth, viewportHeight);
        viewportCtx.restore();

        overlayViewportCtx.setTransform(1, 0, 0, 1, 0, 0);
        overlayViewportCtx.clearRect(0, 0, overlayViewportCtx.canvas.width, overlayViewportCtx.canvas.height);

        if (gridDisplayMode !== "none") {
            drawGrid(
                overlayViewportCtx,
                { x: offsetX, y: offsetY },
                getGridCellSize(pixelated, pixelSize, zoom),
                viewportWidth,
                viewportHeight,
                dpr
            );
        }

        // Redraw the pending-shape bounding box overlay if a shape is pending.
        // Must run after the overlay is cleared so handles are never lost on
        // resize, pan, or zoom.
        redrawPendingOverlay.current?.();
    }, [
        canvasRef,
        getViewportSize,
        gridDisplayMode,
        pixelSize,
        pixelated,
        replacementCanvasRef,
        resizeViewportCanvas,
        viewOffset.x,
        viewOffset.y,
        zoom,
    ]);

    useEffect(() => {
        renderViewport();
    }, [renderViewport]);

    const renderViewportRef = useRef(renderViewport);
    useEffect(() => {
        renderViewportRef.current = renderViewport;
        setRenderViewport(renderViewport);
    }, [renderViewport, setRenderViewport]);

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
        enterPendingShape,
        confirmPendingShape,
        cancelPendingShape,
    } =
        useDrawingHandlers({
            renderViewport,
            getViewportSize,
            clampViewOffset,
            getMinAllowedZoom,
            sceneRef,
            pushShape,
            redrawFromScene,
            takeSnapshotShape,
        });

    const undo = useCallback(() => {
        if (pendingShapeRef.current !== null) {
            cancelPendingShape();
            return;
        }
        const ctx = contextRef.current;
        if (ctx && undoScene(ctx)) renderViewport();
    }, [contextRef, undoScene, renderViewport, pendingShapeRef, cancelPendingShape]);

    const redo = useCallback(() => {
        const ctx = contextRef.current;
        if (ctx && redoScene(ctx)) renderViewport();
    }, [contextRef, redoScene, renderViewport]);

    const saveSnapshot = useCallback(() => {
        const ctx = contextRef.current;
        if (!ctx) return;
        pushShape(takeSnapshotShape(ctx));
        renderViewport();
    }, [contextRef, pushShape, takeSnapshotShape, renderViewport]);

    const copySnapshot = useCallback(() => {
        const docCanvas = documentCanvasRef.current;
        if (!docCanvas) return;
        docCanvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await ClipboardImageLoader.copyImageToClipboard(blob);
                    alert('Imagem copiada para a área de transferência');
                } catch {
                    alert('Falha ao copiar a imagem para a área de transferência');
                }
            }
        }, 'image/png');
    }, []);

    const pasteSnapshot = useCallback(async () => {
        const ctx = contextRef.current;
        if (!ctx) return;
        try {
            if (pendingShapeRef.current !== null) {
                confirmPendingShape();
            }
            const img = await ClipboardImageLoader.loadImageFromClipboard();
            const imageShape = new ImageShape(img, 0, 0, img.naturalWidth, img.naturalHeight);
            redrawFromScene(ctx);
            imageShape.draw(ctx);
            enterPendingShape(imageShape);
        } catch {
            alert('Falha ao colar imagem da área de transferência');
        }
    }, [confirmPendingShape, contextRef, enterPendingShape, pendingShapeRef, redrawFromScene]);

    useEffect(() => {
        const setupCanvas = () => {
            const viewportCanvas = canvasRef.current;
            const overlayCanvas = replacementCanvasRef.current;
            const parent = containerRef.current;
            if (!viewportCanvas || !overlayCanvas || !parent) return;

            const rect = parent.getBoundingClientRect();
            const viewportWidth = Math.max(1, Math.floor(rect.width));
            const viewportHeight = Math.max(1, Math.floor(rect.height));
            const worldWidth = Math.max(MIN_CANVAS_WIDTH, canvasSize.width, Math.ceil(viewportWidth * CANVAS_SCALE_FACTOR));
            const worldHeight = Math.max(MIN_CANVAS_HEIGHT, canvasSize.height, Math.ceil(viewportHeight * CANVAS_SCALE_FACTOR));

            if (!documentCanvasRef.current) {
                documentCanvasRef.current = document.createElement('canvas');
            }
            const documentCanvas = documentCanvasRef.current;

            const needsResize = documentCanvas.width !== worldWidth || documentCanvas.height !== worldHeight;
            if (needsResize) {
                documentCanvas.width = worldWidth;
                documentCanvas.height = worldHeight;
            }

            const ctx = documentCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
            if (ctx) {
                ctx.imageSmoothingEnabled = false;
                ctx.globalAlpha = 1;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                contextRef.current = ctx;

                if (needsResize) {
                    redrawFromScene(ctx);
                    // Pending shape is not in the scene yet — redraw it so it
                    // survives the canvas clear that happens on resize.
                    pendingShapeRef.current?.draw(ctx);
                }
            }

            const overlayCtx = overlayCanvas.getContext("2d");
            if (overlayCtx) {
                overlayCtx.imageSmoothingEnabled = false;
                replacementContextRef.current = overlayCtx;
            }

            setViewOffset((prev) => {
                const next = clampViewOffset(prev, viewportWidth, viewportHeight, worldWidth, worldHeight);
                return next.x === prev.x && next.y === prev.y ? prev : next;
            });

            renderViewportRef.current();
        };

        setupCanvas();

        const parent = containerRef.current;
        if (!parent || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(() => { setupCanvas(); });
        observer.observe(parent);
        return () => observer.disconnect();
    }, [
        canvasRef,
        replacementCanvasRef,
        containerRef,
        contextRef,
        replacementContextRef,
        redrawFromScene,
        clampViewOffset,
        setViewOffset,
        canvasSize.width,
        canvasSize.height,
    ]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
        undo,
        redo,
        pasteSnapshot,
        copySnapshot,
        saveSnapshot,
    };
};

export default useCanvas;
