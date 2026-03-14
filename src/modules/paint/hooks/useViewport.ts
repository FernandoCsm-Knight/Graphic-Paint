import { useCallback, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PaintContext } from "../context/PaintContext";
import { ReplacementContext } from "../context/ReplacementContext";
import { SettingsContext } from "../context/SettingsContext";
import { drawGrid, getGridCellSize } from "../utils/Grid";
import type { Point } from "../../../functions/geometry";

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.12;

const useViewport = (documentCanvasRef: RefObject<HTMLCanvasElement | null>) => {
    const { canvasRef, containerRef, viewOffset, zoom, pixelated } = useContext(PaintContext)!;
    const { replacementCanvasRef } = useContext(ReplacementContext)!;
    const { pixelSize, gridDisplayMode } = useContext(SettingsContext)!;

    const viewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const overlayViewportCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    const getViewportSize = useCallback(() => {
        const viewport = containerRef.current;
        return (viewport) ? {
            width: Math.max(1, Math.floor(viewport.clientWidth)),
            height: Math.max(1, Math.floor(viewport.clientHeight))
        } : { width: 0, height: 0 };
    }, [containerRef]);

    const resizeViewportCanvas = useCallback((canvas: HTMLCanvasElement, width: number, height: number) => {
        const dpr = window.devicePixelRatio || 1;
        const bitmapWidth = Math.max(1, Math.floor(width * dpr));
        const bitmapHeight = Math.max(1, Math.floor(height * dpr));
        if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
        if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }, []);

    const clampViewOffset = useCallback((
        next: Point,
        viewportWidth?: number,
        viewportHeight?: number,
        canvasWidth?: number,
        canvasHeight?: number,
        zoomLevel?: number
    ): Point => {
        const resolvedViewport = getViewportSize();
        const resolvedViewportWidth = viewportWidth ?? resolvedViewport.width;
        const resolvedViewportHeight = viewportHeight ?? resolvedViewport.height;
        const resolvedCanvasWidth = canvasWidth ?? documentCanvasRef.current?.width ?? 0;
        const resolvedCanvasHeight = canvasHeight ?? documentCanvasRef.current?.height ?? 0;
        const scale = zoomLevel ?? zoom;
        const scaledCanvasWidth = resolvedCanvasWidth * scale;
        const scaledCanvasHeight = resolvedCanvasHeight * scale;
        const minX = Math.min(0, resolvedViewportWidth - scaledCanvasWidth);
        const minY = Math.min(0, resolvedViewportHeight - scaledCanvasHeight);
        return {
            x: Math.min(0, Math.max(minX, next.x)),
            y: Math.min(0, Math.max(minY, next.y)),
        };
    }, [documentCanvasRef, getViewportSize, zoom]);

    const getMinAllowedZoom = useCallback((
        viewportWidth?: number,
        viewportHeight?: number,
        canvasWidth?: number,
        canvasHeight?: number
    ) => {
        const resolvedViewport = getViewportSize();
        const resolvedViewportWidth = viewportWidth ?? resolvedViewport.width;
        const resolvedViewportHeight = viewportHeight ?? resolvedViewport.height;
        const resolvedCanvasWidth = canvasWidth ?? documentCanvasRef.current?.width ?? 0;
        const resolvedCanvasHeight = canvasHeight ?? documentCanvasRef.current?.height ?? 0;
        if (resolvedCanvasWidth <= 0 || resolvedCanvasHeight <= 0) return MIN_ZOOM;
        return Math.max(
            MIN_ZOOM,
            resolvedViewportWidth / resolvedCanvasWidth,
            resolvedViewportHeight / resolvedCanvasHeight
        );
    }, [documentCanvasRef, getViewportSize]);

    const renderViewport = useCallback(() => {
        const documentCanvas = documentCanvasRef.current;  // off-screen drawing surface
        const viewportCanvas = canvasRef.current;          // on-screen display canvas
        const overlayCanvas = replacementCanvasRef.current; // on-screen overlay canvas
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();

        if (!documentCanvas || !viewportCanvas || !overlayCanvas || viewportWidth <= 0 || viewportHeight <= 0) {
            return;
        }

        // Only viewport canvases are resized to match the window — document canvas keeps its full size
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

        // Draw the off-screen document canvas onto the on-screen viewport canvas
        viewportCtx.setTransform(1, 0, 0, 1, 0, 0);
        viewportCtx.clearRect(0, 0, viewportCtx.canvas.width, viewportCtx.canvas.height);
        viewportCtx.imageSmoothingEnabled = false;

        const offsetX = viewOffset.x;
        const offsetY = viewOffset.y;
        const sourceWidth = Math.min(documentCanvas.width, viewportWidth / zoom);
        const sourceHeight = Math.min(documentCanvas.height, viewportHeight / zoom);
        const maxSourceX = Math.max(0, documentCanvas.width - sourceWidth);
        const maxSourceY = Math.max(0, documentCanvas.height - sourceHeight);
        const sourceX = Math.min(maxSourceX, Math.max(0, -offsetX / zoom));
        const sourceY = Math.min(maxSourceY, Math.max(0, -offsetY / zoom));

        viewportCtx.save();
        viewportCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        viewportCtx.drawImage(documentCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, viewportWidth, viewportHeight);
        viewportCtx.restore();

        // Draw grid on overlay
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
    }, [
        documentCanvasRef,
        canvasRef,
        replacementCanvasRef,
        getViewportSize,
        resizeViewportCanvas,
        viewOffset.x,
        viewOffset.y,
        zoom,
        gridDisplayMode,
        pixelated,
        pixelSize,
    ]);

    // Re-render viewport whenever zoom, pan, or grid settings change
    useEffect(() => {
        renderViewport();
    }, [renderViewport]);

    return { renderViewport, getViewportSize, clampViewOffset, getMinAllowedZoom };
};

export default useViewport;
