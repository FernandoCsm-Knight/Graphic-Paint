import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, PointerEvent, RefObject, SetStateAction, WheelEvent } from "react";
import type { Point } from "../types/geometry";
import { MAX_ZOOM, ZOOM_STEP } from "./useWorkspaceViewport";

const DEFAULT_WORLD_GROWTH_STEP = 1200;

type Size = {
    width: number;
    height: number;
};

type WorkspacePanZoomInput = {
    interactionRef: RefObject<Element | null>;
    containerRef: RefObject<HTMLElement | null>;
    viewOffset: Point;
    setViewOffset: Dispatch<SetStateAction<Point>>;
    zoom: number;
    setZoom: (value: number) => void;
    worldSize: Size;
    setWorldSize?: Dispatch<SetStateAction<Size>>;
    setIsPanning?: (value: boolean) => void;
    isPanModeActive?: boolean;
    growthStep?: number;
    getViewportSize: () => Size;
    clampViewOffset: (
        next: Point,
        viewportWidth?: number,
        viewportHeight?: number,
        worldWidth?: number,
        worldHeight?: number,
        zoomLevel?: number
    ) => Point;
    getMinAllowedZoom: (
        viewportWidth?: number,
        viewportHeight?: number,
        worldWidth?: number,
        worldHeight?: number
    ) => number;
};

const useWorkspacePanZoom = ({
    interactionRef,
    containerRef,
    viewOffset,
    setViewOffset,
    zoom,
    setZoom,
    worldSize,
    setWorldSize,
    setIsPanning,
    isPanModeActive = false,
    growthStep = DEFAULT_WORLD_GROWTH_STEP,
    getViewportSize,
    clampViewOffset,
    getMinAllowedZoom,
}: WorkspacePanZoomInput) => {
    const worldSizeRef = useRef(worldSize);
    const panSession = useRef<{
        pointerId: number;
        mode: "middle" | "tool";
        startClientX: number;
        startClientY: number;
        originOffset: Point;
    } | null>(null);

    useEffect(() => {
        worldSizeRef.current = worldSize;
    }, [worldSize]);

    const maybeGrowWorld = useCallback((candidateOffset: Point) => {
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        const currentWorldSize = worldSizeRef.current;
        if (viewportWidth <= 0 || viewportHeight <= 0 || !setWorldSize) {
            return { width: currentWorldSize.width, height: currentWorldSize.height };
        }

        let nextWidth = currentWorldSize.width;
        let nextHeight = currentWorldSize.height;

        if (candidateOffset.x < Math.min(0, viewportWidth - currentWorldSize.width * zoom)) {
            nextWidth += growthStep;
        }
        if (candidateOffset.y < Math.min(0, viewportHeight - currentWorldSize.height * zoom)) {
            nextHeight += growthStep;
        }

        if (nextWidth !== currentWorldSize.width || nextHeight !== currentWorldSize.height) {
            setWorldSize((previous) => ({
                width: Math.max(previous.width, nextWidth),
                height: Math.max(previous.height, nextHeight),
            }));
            worldSizeRef.current = { width: nextWidth, height: nextHeight };
        }

        return { width: nextWidth, height: nextHeight };
    }, [getViewportSize, growthStep, setWorldSize, zoom]);

    const onPointerDown = useCallback((event: PointerEvent<Element>): boolean => {
        const interactionElement = interactionRef.current;
        if (!interactionElement) return false;

        if (event.button === 1 || (event.button === 0 && isPanModeActive)) {
            event.preventDefault();
            interactionElement.setPointerCapture(event.pointerId);
            panSession.current = {
                pointerId: event.pointerId,
                mode: event.button === 1 ? "middle" : "tool",
                startClientX: event.clientX,
                startClientY: event.clientY,
                originOffset: viewOffset,
            };
            setIsPanning?.(true);
            return true;
        }

        if (panSession.current?.pointerId === event.pointerId) {
            panSession.current = null;
            setIsPanning?.(false);
        }

        return false;
    }, [interactionRef, isPanModeActive, setIsPanning, viewOffset]);

    const onPointerMove = useCallback((event: PointerEvent<Element>): boolean => {
        if (panSession.current?.pointerId !== event.pointerId) return false;

        const isPanButtonHeld = panSession.current.mode === "tool"
            ? isPanModeActive && (event.buttons & 1) === 1
            : (event.buttons & 4) === 4;

        if (!isPanButtonHeld) {
            panSession.current = null;
            setIsPanning?.(false);
            return false;
        }

        event.preventDefault();
        const candidateOffset = {
            x: panSession.current.originOffset.x + (event.clientX - panSession.current.startClientX),
            y: panSession.current.originOffset.y + (event.clientY - panSession.current.startClientY),
        };
        const nextWorldSize = maybeGrowWorld(candidateOffset);

        setViewOffset((previous) => {
            const next = clampViewOffset(
                candidateOffset,
                undefined,
                undefined,
                nextWorldSize.width,
                nextWorldSize.height
            );
            return next.x === previous.x && next.y === previous.y ? previous : next;
        });

        return true;
    }, [clampViewOffset, isPanModeActive, maybeGrowWorld, setIsPanning, setViewOffset]);

    const onPointerUp = useCallback((event?: PointerEvent<Element>): boolean => {
        if (!panSession.current) return false;
        if (event && panSession.current.pointerId !== event.pointerId) return false;

        setIsPanning?.(false);
        panSession.current = null;

        if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        return true;
    }, [setIsPanning]);

    const handleWheel = useCallback((event: WheelEvent<HTMLElement>) => {
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        if (viewportWidth <= 0 || viewportHeight <= 0) return;

        if (event.cancelable) {
            event.preventDefault();
        }

        const direction = event.deltaY < 0 ? 1 : -1;
        const minZoom = getMinAllowedZoom(viewportWidth, viewportHeight, worldSize.width, worldSize.height);
        const nextZoom = Math.min(MAX_ZOOM, Math.max(minZoom, Number((zoom + direction * ZOOM_STEP).toFixed(2))));
        if (nextZoom === zoom) return;

        const viewport = containerRef.current;
        if (!viewport) return;

        const rect = viewport.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        const worldX = (localX - viewOffset.x) / zoom;
        const worldY = (localY - viewOffset.y) / zoom;

        setZoom(nextZoom);
        setViewOffset((previous) => {
            const next = clampViewOffset(
                { x: localX - worldX * nextZoom, y: localY - worldY * nextZoom },
                viewportWidth,
                viewportHeight,
                worldSize.width,
                worldSize.height,
                nextZoom
            );
            return next.x === previous.x && next.y === previous.y ? previous : next;
        });
    }, [
        clampViewOffset,
        containerRef,
        getMinAllowedZoom,
        getViewportSize,
        setViewOffset,
        setZoom,
        viewOffset.x,
        viewOffset.y,
        worldSize.height,
        worldSize.width,
        zoom,
    ]);

    return { onPointerDown, onPointerMove, onPointerUp, handleWheel };
};

export default useWorkspacePanZoom;
