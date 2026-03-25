import { createContext, type RefObject } from "react";

export type GridSettings = {
    lineColor: string;
};

export type ReplacementContextType = {
    replacementCanvasRef: RefObject<HTMLCanvasElement | null>;
    replacementContextRef: RefObject<CanvasRenderingContext2D | null>;

    settings: GridSettings;
};

export const ReplacementContext = createContext<ReplacementContextType | undefined>(undefined);
