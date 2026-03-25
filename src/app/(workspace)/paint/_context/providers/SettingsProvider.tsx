'use client';

import { useMemo, useState } from "react";
import { SettingsContext, type BrushStyle, type ClipAlgorithm, type GridDisplayMode, type LineAlgorithm, type LineDashPreset, type PlacementMode } from "../SettingsContext";

const SettingsProvider = ( { children }: { children: React.ReactNode } ) => {

    const [pixelSize, setPixelSize] = useState<number>(20);
    const [lineAlgorithm, setLineAlgorithm] = useState<LineAlgorithm>("bresenham");
    const [gridDisplayMode, setGridDisplayMode] = useState<GridDisplayMode>("behind");
    const [pageSizeEraser, setPageSizeEraser] = useState<boolean>(false);
    const [clipAlgorithm, setClipAlgorithm] = useState<ClipAlgorithm>("cohen-sutherland");
    const [lineDashPreset, setLineDashPreset] = useState<LineDashPreset>("solid");
    const [brushStyle, setBrushStyle] = useState<BrushStyle>("smooth");
    const [placementMode, setPlacementMode] = useState<PlacementMode>("bbox");

    const settingsContext = useMemo(() => ({
        pixelSize,
        setPixelSize,
        lineAlgorithm,
        setLineAlgorithm,
        gridDisplayMode,
        setGridDisplayMode,
        pageSizeEraser,
        setPageSizeEraser,
        clipAlgorithm,
        setClipAlgorithm,
        lineDashPreset,
        setLineDashPreset,
        brushStyle,
        setBrushStyle,
        placementMode,
        setPlacementMode,
    }), [pixelSize, lineAlgorithm, gridDisplayMode, pageSizeEraser, clipAlgorithm, lineDashPreset, brushStyle, placementMode]);

    return (
        <SettingsContext.Provider value={settingsContext}>
            { children }
        </SettingsContext.Provider>
    );
};


export default SettingsProvider;