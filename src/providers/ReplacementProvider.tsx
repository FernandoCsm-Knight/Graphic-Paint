import { useRef } from "react";
import { ReplacementContext } from "../context/ReplacementContext";

type PaintProviderProps = {
    children: React.ReactNode;
};

const ReplacementProvider = ({ children }: PaintProviderProps) => {
    const gridSettings = {
        lineColor: '#dddddd'
    };

    const replacementSettings = {
        replacementCanvasRef: useRef<HTMLCanvasElement | null>(null),
        replacementContextRef: useRef<CanvasRenderingContext2D | null>(null),
        settings: gridSettings
    };

    return (
        <ReplacementContext.Provider value={replacementSettings}>
            { children }
        </ReplacementContext.Provider>
    );
};

export default ReplacementProvider;