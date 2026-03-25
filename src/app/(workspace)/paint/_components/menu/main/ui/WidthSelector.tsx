'use client';

import { useCallback, useContext, useEffect, useState } from "react";
import { PaintContext } from "../../../../_context/PaintContext";

const WidthSelector = () => {
    const { thicknessRef, pixelated } = useContext(PaintContext)!;
    const [lineWidth, setLineWidth] = useState<number>(pixelated ? 1 : 5);

    useEffect(() => {
        const width = pixelated ? 1 : 5;
        const frame = requestAnimationFrame(() => {
            thicknessRef.current = width;
            setLineWidth(width);
        });

        return () => cancelAnimationFrame(frame);
    }, [pixelated, thicknessRef]);

    const onLineWidthChange = useCallback((lineWidth: number) => {
        thicknessRef.current = lineWidth;
        setLineWidth(lineWidth);
    }, [thicknessRef]);

    return(
        <label className="flex items-center gap-[var(--pm-gap)] min-w-0 w-full">
            <span className="ui-value-chip px-[var(--pm-btn-pad)] py-0.5 text-center rounded-md w-15 whitespace-nowrap text-xs">{lineWidth}</span>
            <input type="range" min="1" max={pixelated ? "5" :"100"} step="1" value={lineWidth} onChange={(e) => {onLineWidthChange(Number.parseInt(e.target.value))}} className="grow slider h-2 rounded-lg cursor-pointer" />
        </label>
    );
};

export default WidthSelector;
