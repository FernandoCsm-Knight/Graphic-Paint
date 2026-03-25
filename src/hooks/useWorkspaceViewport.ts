import { useCallback } from "react";
import type { RefObject } from "react";
import type { Point } from "../types/geometry";

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.12;

type Size = {
    width: number;
    height: number;
};

type WorkspaceViewportInput = {
    containerRef: RefObject<HTMLElement | null>;
    zoom: number;
    getWorldSize: () => Size;
};

const useWorkspaceViewport = ({ containerRef, zoom, getWorldSize }: WorkspaceViewportInput) => {
    const getViewportSize = useCallback(() => {
        const viewport = containerRef.current;
        return viewport
            ? {
                width: Math.max(1, Math.floor(viewport.clientWidth)),
                height: Math.max(1, Math.floor(viewport.clientHeight)),
            }
            : { width: 0, height: 0 };
    }, [containerRef]);

    const clampViewOffset = useCallback((
        next: Point,
        viewportWidth?: number,
        viewportHeight?: number,
        worldWidth?: number,
        worldHeight?: number,
        zoomLevel?: number
    ): Point => {
        const resolvedViewport = getViewportSize();
        const resolvedViewportWidth = viewportWidth ?? resolvedViewport.width;
        const resolvedViewportHeight = viewportHeight ?? resolvedViewport.height;
        const resolvedWorld = getWorldSize();
        const resolvedWorldWidth = worldWidth ?? resolvedWorld.width;
        const resolvedWorldHeight = worldHeight ?? resolvedWorld.height;
        const scale = zoomLevel ?? zoom;
        const scaledWorldWidth = resolvedWorldWidth * scale;
        const scaledWorldHeight = resolvedWorldHeight * scale;
        const minX = Math.min(0, resolvedViewportWidth - scaledWorldWidth);
        const minY = Math.min(0, resolvedViewportHeight - scaledWorldHeight);

        return {
            x: Math.min(0, Math.max(minX, next.x)),
            y: Math.min(0, Math.max(minY, next.y)),
        };
    }, [getViewportSize, getWorldSize, zoom]);

    const getMinAllowedZoom = useCallback((
        viewportWidth?: number,
        viewportHeight?: number,
        worldWidth?: number,
        worldHeight?: number
    ) => {
        const resolvedViewport = getViewportSize();
        const resolvedViewportWidth = viewportWidth ?? resolvedViewport.width;
        const resolvedViewportHeight = viewportHeight ?? resolvedViewport.height;
        const resolvedWorld = getWorldSize();
        const resolvedWorldWidth = worldWidth ?? resolvedWorld.width;
        const resolvedWorldHeight = worldHeight ?? resolvedWorld.height;

        if (resolvedWorldWidth <= 0 || resolvedWorldHeight <= 0) return MIN_ZOOM;

        return Math.max(
            MIN_ZOOM,
            resolvedViewportWidth / resolvedWorldWidth,
            resolvedViewportHeight / resolvedWorldHeight
        );
    }, [getViewportSize, getWorldSize]);

    return { getViewportSize, clampViewOffset, getMinAllowedZoom };
};

export default useWorkspaceViewport;
