import { useRef, useState } from "react";
import { PaintContext, type PaintContextType } from "../context/PaintContext";
import type { Geometric } from "../types/Graphics";

type PaintProviderProps = {
    children: React.ReactNode;
};

const PaintProvider = ({ children }: PaintProviderProps) => {
    const [pixelated, setPixelated] = useState<boolean>(false);
    const [isEraserActive, setEraser] = useState<boolean>(false);
    const [isFillActive, setFill] = useState<boolean>(false);
    const [isSelectionActive, setSelectionActive] = useState<boolean>(false);
    const [selectedShape, setSelectedShape] = useState<Geometric>('freeform');

    const paintContext: PaintContextType = {
        canvasRef: useRef<HTMLCanvasElement | null>(null),
        containerRef: useRef<HTMLDivElement | null>(null),
        contextRef: useRef<CanvasRenderingContext2D | null>(null),
        currentColor: useRef<string>('#000000'),
        thickness: useRef<number>(5),
        
        pixelated: pixelated,
        setPixelated: setPixelated,
        isEraserActive: isEraserActive,
        setEraser: setEraser,
        isFillActive: isFillActive,
        setFill: setFill,
        isSelectionActive: isSelectionActive,
        setSelectionActive: setSelectionActive,
        selectedShape: selectedShape,
        setSelectedShape: setSelectedShape,
    };

    return (
        <PaintContext.Provider value={paintContext}>
            { children }
        </PaintContext.Provider>
    );
};

export default PaintProvider;
