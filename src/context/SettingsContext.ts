import { createContext } from "react";

export type LineAlgorithm = "bresenham" | "dda";
export type GridDisplayMode = "behind" | "front" | "none";

export type SettingsContextType = {
    pixelSize: number;
    setPixelSize: (value: number) => void;
    lineAlgorithm: LineAlgorithm;
    setLineAlgorithm: (value: LineAlgorithm) => void;
    gridDisplayMode: GridDisplayMode;
    setGridDisplayMode: (value: GridDisplayMode) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
