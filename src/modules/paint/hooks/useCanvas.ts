import { useCallback, useContext, useEffect, useRef } from "react";
import { PaintContext } from "../context/PaintContext";
import { ReplacementContext } from "../context/ReplacementContext";
import { ClipboardImageLoader } from "../utils/ClipboardImageLoader";
import ImageShape from "../shapes/ImageShape";
import useViewport from "./useViewport";
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
        setViewOffset,
        setRenderViewport,
    } = useContext(PaintContext)!;

    const { replacementCanvasRef, replacementContextRef } = useContext(ReplacementContext)!;

    const { pushShape, undoScene, redoScene, redrawFromScene, takeSnapshotShape } = useScene();

    const { renderViewport, getViewportSize, clampViewOffset, getMinAllowedZoom } = useViewport(documentCanvasRef);

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
        hasPendingShape,
    } =
        useDrawingHandlers({
            renderViewport,
            getViewportSize,
            clampViewOffset,
            getMinAllowedZoom,
            pushShape,
            redrawFromScene,
            takeSnapshotShape,
        });

    const undo = useCallback(() => {
        const ctx = contextRef.current;
        if (ctx && undoScene(ctx)) renderViewport();
    }, [contextRef, undoScene, renderViewport]);

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
            if (hasPendingShape()) {
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
    }, [confirmPendingShape, contextRef, enterPendingShape, hasPendingShape, redrawFromScene]);

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
