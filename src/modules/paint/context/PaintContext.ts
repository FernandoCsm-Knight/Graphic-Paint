import { createContext, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Geometric } from "../types/Graphics";
import type { Shape } from "../shapes/ShapeTypes";
import type { SelectionOverlayItem } from "../selection/SelectionOverlayItem";

export type PaintContextType = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    contextRef: RefObject<CanvasRenderingContext2D | null>;
    currentColor: RefObject<string>;
    thickness: RefObject<number>;
    /** The shape currently in pending-placement mode, or null if none. */
    pendingShapeRef: RefObject<Shape | null>;
    /**
     * The CSS cursor string for the currently active tool (fill, selection, …).
     * Empty string means no tool is active (default cursor).
     * usePendingPlacement restores this cursor when pending mode exits.
     */
    toolCursor: RefObject<string>;
    /**
     * Callback registered by usePendingPlacement to redraw the bounding-box
     * overlay for the current pending shape. renderViewport() calls this after
     * clearing the overlay so the handles are never lost on resize/pan/zoom.
     */
    redrawPendingOverlay: RefObject<(() => void) | null>;
    /**
     * Owned by useSelection. renderViewport() calls redrawOverlay() after
     * clearing the overlay so the selection UI is never lost on resize/pan/zoom.
     */
    selectionItemRef: RefObject<SelectionOverlayItem>;

    pixelated: boolean;
    setPixelated: (value: boolean) => void;
    isEraserActive: boolean;
    setEraser: (value: boolean) => void;
    isFillActive: boolean;
    setFill: (value: boolean) => void;
    isSelectionActive: boolean;
    setSelectionActive: (value: boolean) => void;
    selectedShape: Geometric;
    setSelectedShape: (value: Geometric) => void;
    /** User-configured minimum document size (world never shrinks below this). */
    canvasSize: { width: number; height: number };
    setCanvasSize: Dispatch<SetStateAction<{ width: number; height: number }>>;
    renderViewport: () => void;
    setRenderViewport: (callback: () => void) => void;

    saveSnapshot?: () => void;
};

export const PaintContext = createContext<PaintContextType | undefined>(undefined);

