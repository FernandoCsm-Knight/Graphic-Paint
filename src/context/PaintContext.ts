import { createContext, type RefObject } from "react";
import type { Geometric } from "../types/ShapeTypes";

export type PaintContextType = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;
    contextRef: RefObject<CanvasRenderingContext2D | null>;
    isEraserActive: RefObject<boolean>;
    isFillActive: RefObject<boolean>;
    currentColor: RefObject<string>;
    thickness: RefObject<number>;
    selectedShape: RefObject<Geometric>;
    
    pixelated: boolean;
    setPixelated: (value: boolean) => void;

};

export const PaintContext = createContext<PaintContextType | undefined>(undefined);

