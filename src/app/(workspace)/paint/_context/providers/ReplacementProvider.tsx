'use client';

import { useMemo, useRef } from "react";
import { ReplacementContext } from "../ReplacementContext";

type PaintProviderProps = {
    children: React.ReactNode;
};

const ReplacementProvider = ({ children }: PaintProviderProps) => {
    const replacementCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const replacementContextRef = useRef<CanvasRenderingContext2D | null>(null);

    const replacementSettings = useMemo(() => ({
        replacementCanvasRef,
        replacementContextRef,
        settings: { lineColor: '#dddddd' }
    }), []);

    return (
        <ReplacementContext.Provider value={replacementSettings}>
            { children }
        </ReplacementContext.Provider>
    );
};

export default ReplacementProvider;
