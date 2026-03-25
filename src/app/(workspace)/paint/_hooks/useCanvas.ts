import { useCallback, useContext, useEffect, useRef } from "react";
import { PaintContext } from "../_context/PaintContext";
import { ReplacementContext } from "../_context/ReplacementContext";
import { SettingsContext } from "../_context/SettingsContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import useWorkspaceViewport from "@/hooks/useWorkspaceViewport";
import { drawGrid, getGridCellSize } from "@/utils/workspaceGrid";
import { ClipboardImageLoader } from "../_utils/ClipboardImageLoader";
import { deserializePaintScene, serializePaintScene } from "../_utils/scenePersistence";
import ImageShape from "../_shapes/ImageShape";
import useDrawingHandlers from "./useDrawingHandlers";
import useScene from "./useScene";
import type { PaintProjectSnapshot } from '@/lib/workspace/projectPersistence.schemas';

const MIN_CANVAS_WIDTH = 2400;
const MIN_CANVAS_HEIGHT = 1600;
const CANVAS_SCALE_FACTOR = 2;

type UseCanvasOptions = {
    projectId?: string;
    initialScene?: PaintProjectSnapshot['scene'];
};

const useCanvas = ({ projectId, initialScene }: UseCanvasOptions = {}) => {
    const documentCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const persistTimeoutRef = useRef<number | null>(null);
    const initialSceneLoadedRef = useRef(initialScene == null);
    const lastSavedPayloadRef = useRef<string | null>(null);

    const {
        canvasRef,
        contextRef,
        canvasSize,
        pixelated,
        setRenderViewport,
        pendingShapeRef,
        redrawPendingOverlayRef,
        selectionItemRef,
    } = useContext(PaintContext)!;

    const {
        containerRef,
        viewOffset,
        zoom,
        setViewOffset,
        worldSize,
        setWorldSize,
    } = useWorkspaceContext();

    const { replacementCanvasRef, replacementContextRef } = useContext(ReplacementContext)!;
    const {
        pixelSize,
        gridDisplayMode,
        lineAlgorithm,
        clipAlgorithm,
        lineDashPreset,
        brushStyle,
        placementMode,
    } = useContext(SettingsContext)!;

    const { sceneRef, sceneRevision, pushShape, undoScene, redoScene, redrawFromScene, takeSnapshotShape, replaceScene } = useScene();

    const viewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const overlayViewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    const getWorldSize = useCallback(() => worldSize, [worldSize]);
    const { getViewportSize, clampViewOffset, getMinAllowedZoom } = useWorkspaceViewport({
        containerRef,
        zoom,
        getWorldSize,
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
        viewportCtx.imageSmoothingEnabled = !pixelated;
        viewportCtx.imageSmoothingQuality = pixelated ? 'low' : 'high';
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
        redrawPendingOverlayRef.current?.();
        // Redraw selection UI (dashed rect or floating image) for the same reason.
        selectionItemRef.current.redrawOverlay();
    }, [
        canvasRef,
        getViewportSize,
        gridDisplayMode,
        pixelSize,
        pixelated,
        redrawPendingOverlayRef,
        replacementCanvasRef,
        resizeViewportCanvas,
        selectionItemRef,
        viewOffset.x,
        viewOffset.y,
        zoom,
    ]);

    useEffect(() => {
        renderViewport();
    }, [renderViewport]);

    useEffect(() => {
        return () => {
            if (persistTimeoutRef.current !== null) {
                window.clearTimeout(persistTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!projectId || !initialSceneLoadedRef.current) return;

        if (persistTimeoutRef.current !== null) {
            window.clearTimeout(persistTimeoutRef.current);
        }

        persistTimeoutRef.current = window.setTimeout(() => {
            void (async () => {
                const payload = {
                    canvasWidth: canvasSize.width,
                    canvasHeight: canvasSize.height,
                    pixelated,
                    pixelSize,
                    viewOffset,
                    zoom,
                    lineAlgorithm,
                    gridDisplay: gridDisplayMode,
                    clipAlgorithm,
                    lineDash: lineDashPreset,
                    brushStyle,
                    placementMode,
                    scene: await serializePaintScene(sceneRef.current),
                } satisfies PaintProjectSnapshot;

                const nextPayload = JSON.stringify(payload);
                if (nextPayload === lastSavedPayloadRef.current) {
                    return;
                }

                const response = await fetch(`/api/projects/paint/${projectId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store',
                    },
                    body: nextPayload,
                });

                if (response.ok) {
                    lastSavedPayloadRef.current = nextPayload;
                }
            })().catch(() => {
                // Preserve local state; the next change will attempt another save.
            });
        }, 900);

        return () => {
            if (persistTimeoutRef.current !== null) {
                window.clearTimeout(persistTimeoutRef.current);
                persistTimeoutRef.current = null;
            }
        };
    }, [
        brushStyle,
        canvasSize.height,
        canvasSize.width,
        clipAlgorithm,
        gridDisplayMode,
        lineAlgorithm,
        lineDashPreset,
        pixelSize,
        pixelated,
        placementMode,
        projectId,
        sceneRef,
        sceneRevision,
        viewOffset,
        zoom,
    ]);

    const renderViewportRef = useRef(renderViewport);
    useEffect(() => {
        renderViewportRef.current = renderViewport;
        setRenderViewport(renderViewport);
    }, [renderViewport, setRenderViewport]);

    useEffect(() => {
        const ctx = contextRef.current;
        if (!initialScene || initialSceneLoadedRef.current || !ctx) return;

        let cancelled = false;

        void deserializePaintScene(initialScene).then((sceneItems) => {
            if (cancelled || !contextRef.current) return;

            replaceScene(sceneItems);
            redrawFromScene(contextRef.current);
            initialSceneLoadedRef.current = true;
            renderViewportRef.current();
        });

        return () => {
            cancelled = true;
        };
    }, [contextRef, initialScene, redrawFromScene, replaceScene]);

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
        enterPendingShape,
        confirmPendingShape,
        cancelPendingShape,
        lockButtonRef,
        handleLockClick,
    } =
        useDrawingHandlers({
            renderViewport,
            getViewportSize,
            clampViewOffset,
            getMinAllowedZoom,
            sceneRef,
            pushShape,
            replaceScene,
            redrawFromScene,
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
        const container = containerRef.current;
        if (!ctx) return;
        try {
            if (pendingShapeRef.current !== null) {
                confirmPendingShape();
            }
            const img = await ClipboardImageLoader.loadImageFromClipboard();

            // Place the image centered on the current viewport instead of (0, 0).
            const vpW = container?.clientWidth  ?? ctx.canvas.width;
            const vpH = container?.clientHeight ?? ctx.canvas.height;
            const worldCenterX = (vpW / 2 - viewOffset.x) / zoom;
            const worldCenterY = (vpH / 2 - viewOffset.y) / zoom;
            const x = Math.round(worldCenterX - img.naturalWidth  / 2);
            const y = Math.round(worldCenterY - img.naturalHeight / 2);

            const imageShape = new ImageShape(img, x, y, img.naturalWidth, img.naturalHeight);
            redrawFromScene(ctx);
            imageShape.draw(ctx);
            enterPendingShape(imageShape);
        } catch {
            alert('Falha ao colar imagem da área de transferência');
        }
    }, [confirmPendingShape, containerRef, contextRef, enterPendingShape, pendingShapeRef, redrawFromScene, viewOffset, zoom]);

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

            setWorldSize((prev) => {
                const nextW = Math.max(prev.width, worldWidth);
                const nextH = Math.max(prev.height, worldHeight);
                return nextW === prev.width && nextH === prev.height ? prev : { width: nextW, height: nextH };
            });

            if (!documentCanvasRef.current) {
                documentCanvasRef.current = document.createElement('canvas');
            }
            const documentCanvas = documentCanvasRef.current;

            // Acquire the context first so willReadFrequently is set on the very first getContext call.
            const ctx = documentCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

            const needsResize = documentCanvas.width !== worldWidth || documentCanvas.height !== worldHeight;
            if (needsResize && ctx) {
                // Preserve existing pixels when growing the canvas.
                const tmp = document.createElement('canvas');
                tmp.width = documentCanvas.width;
                tmp.height = documentCanvas.height;
                tmp.getContext('2d')!.drawImage(documentCanvas, 0, 0);
                documentCanvas.width = worldWidth;
                documentCanvas.height = worldHeight;
                ctx.drawImage(tmp, 0, 0);
            }
            if (ctx) {
                ctx.imageSmoothingEnabled = false;
                ctx.globalAlpha = 1;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                contextRef.current = ctx;

                if (needsResize) {
                    // Redraw from scene to restore any shapes that the canvas clear erased,
                    // then re-draw the pending shape so it survives the resize.
                    redrawFromScene(ctx);
                    pendingShapeRef.current?.draw(ctx);
                }
            }

            const overlayCtx = overlayCanvas.getContext("2d");
            if (overlayCtx) {
                overlayCtx.imageSmoothingEnabled = !pixelated;
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
        pendingShapeRef,
        replacementContextRef,
        redrawFromScene,
        clampViewOffset,
        pixelated,
        setViewOffset,
        setWorldSize,
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
        lockButtonRef,
        handleLockClick,
    };
};

export default useCanvas;
