import { useMemo, useRef, useState } from "react";
import { PaintContext, type PaintContextType } from "../PaintContext";
import type { Geometric } from "../../types/Graphics";
import type { Shape } from "../../shapes/ShapeTypes";
import { SelectionOverlayItem } from "../../selection/SelectionOverlayItem";

const DEFAULT_CANVAS_SIZE = {
    width: 2400,
    height: 1600,
};

type PaintProviderProps = {
    children: React.ReactNode;
};

const PaintProvider = ({ children }: PaintProviderProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const currentColor = useRef<string>('#000000');
    const thickness = useRef<number>(5);
    const renderViewportRef = useRef<() => void>(() => {});
    const pendingShapeRef = useRef<Shape | null>(null);
    const redrawPendingOverlay = useRef<(() => void) | null>(null);
    const selectionItemRef = useRef<SelectionOverlayItem>(new SelectionOverlayItem());
    const toolCursor = useRef<string>("");

    const [pixelated, setPixelated] = useState<boolean>(false);
    const [isEraserActive, setEraser] = useState<boolean>(false);
    const [isFillActive, setFill] = useState<boolean>(false);
    const [isSelectionActive, setSelectionActive] = useState<boolean>(false);
    const [selectedShape, setSelectedShape] = useState<Geometric>('freeform');
    const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);

    const paintContext = useMemo((): PaintContextType => ({
        canvasRef,
        contextRef,
        currentColor,
        thickness,
        pendingShapeRef,
        redrawPendingOverlay,
        selectionItemRef,
        toolCursor,

        pixelated,
        setPixelated,
        isEraserActive,
        setEraser,
        isFillActive,
        setFill,
        isSelectionActive,
        setSelectionActive,
        selectedShape,
        setSelectedShape,
        canvasSize,
        setCanvasSize,
        renderViewport: () => renderViewportRef.current(),
        setRenderViewport: (callback: () => void) => {
            renderViewportRef.current = callback;
        },
    }), [
        pixelated, isEraserActive, isFillActive, isSelectionActive,
        selectedShape, canvasSize
    ]);

    return (
        <PaintContext.Provider value={paintContext}>
            { children }
        </PaintContext.Provider>
    );
};

export default PaintProvider;
