import { createContext, type RefObject } from "react";
import type { Geometric } from "../types/Graphics";

export type PaintContextType = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;
    contextRef: RefObject<CanvasRenderingContext2D | null>;
    currentColor: RefObject<string>;
    thickness: RefObject<number>;
    
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
};

export const PaintContext = createContext<PaintContextType | undefined>(undefined);

