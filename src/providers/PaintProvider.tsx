import { useRef, useState } from "react";
import { PaintContext, type PaintContextType } from "../context/PaintContext";
import type { Geometric } from "../types/ShapeTypes";

type PaintProviderProps = {
    children: React.ReactNode;
};

const PaintProvider = ({ children }: PaintProviderProps) => {
    const [pixelated, setPixelated] = useState<boolean>(false);
    
    const paintContext: PaintContextType = {
        canvasRef: useRef<HTMLCanvasElement | null>(null),
        containerRef: useRef<HTMLDivElement | null>(null),
        contextRef: useRef<CanvasRenderingContext2D | null>(null),
        isEraserActive: useRef<boolean>(false),
        isFillActive: useRef<boolean>(false),
        currentColor: useRef<string>('#000000'),
        selectedShape: useRef<Geometric>('freeform'),
        thickness: useRef<number>(5),

        pixelated: pixelated,
        setPixelated: setPixelated
    };

    return (
        <PaintContext.Provider value={paintContext}>
            { children }
        </PaintContext.Provider>
    );
};

export default PaintProvider;
