import { useState } from "react";
import { SettingsContext, type GridDisplayMode, type LineAlgorithm } from "../context/SettingsContext";

const SettingsProvider = ( { children }: { children: React.ReactNode } ) => {

    const [pixelSize, setPixelSize] = useState<number>(20);
    const [lineAlgorithm, setLineAlgorithm] = useState<LineAlgorithm>("bresenham");
    const [gridDisplayMode, setGridDisplayMode] = useState<GridDisplayMode>("behind");
    const [pageSizeEraser, setPageSizeEraser] = useState<boolean>(false);

    const settingsContext = {
        pixelSize: pixelSize,
        setPixelSize: setPixelSize,
        lineAlgorithm: lineAlgorithm,
        setLineAlgorithm: setLineAlgorithm,
        gridDisplayMode: gridDisplayMode,
        setGridDisplayMode: setGridDisplayMode,
        pageSizeEraser: pageSizeEraser,
        setPageSizeEraser: setPageSizeEraser
    };
    
    return (
        <SettingsContext.Provider value={settingsContext}>
            { children }
        </SettingsContext.Provider>
    );
};


export default SettingsProvider;