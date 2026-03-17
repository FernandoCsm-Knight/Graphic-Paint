import { createContext } from "react";

export type FillAlgorithm = "floodfill" | "scanline";
export type LineAlgorithm = "bresenham" | "dda";
export type GridDisplayMode = "behind" | "front" | "none";
/** Clip algorithms available in pixelated mode.
 *  - cohen-sutherland / liang-barsky → clip Line and Arrow shapes only
 *  - sutherland-hodgman              → clip polygon shapes only
 */
export type ClipAlgorithm = "cohen-sutherland" | "liang-barsky" | "sutherland-hodgman";

export type LineDashPreset = "solid" | "dashed" | "dotted";
export type BrushStyle = "smooth" | "hard" | "spray";

/** Maps each preset to the canvas dash array. */
export const DASH_ARRAYS: Record<LineDashPreset, number[]> = {
    solid: [],
    dashed: [12, 6],
    dotted: [2, 8]
};

export type SettingsContextType = {
    pixelSize: number;
    setPixelSize: (value: number) => void;
    lineAlgorithm: LineAlgorithm;
    setLineAlgorithm: (value: LineAlgorithm) => void;
    gridDisplayMode: GridDisplayMode;
    setGridDisplayMode: (value: GridDisplayMode) => void;
    pageSizeEraser: boolean;
    setPageSizeEraser: (value: boolean) => void;
    clipAlgorithm: ClipAlgorithm;
    setClipAlgorithm: (value: ClipAlgorithm) => void;
    lineDashPreset: LineDashPreset;
    setLineDashPreset: (value: LineDashPreset) => void;
    brushStyle: BrushStyle;
    setBrushStyle: (value: BrushStyle) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
