import { useCallback, useContext, useState } from "react";
import { PaintContext } from "../../context/PaintContext";

const WidthSelector = () => {
    const { thickness, pixelated } = useContext(PaintContext)!;

    const [lastMode, setLastMode] = useState<boolean>(pixelated);

    const [lineWidth, setLineWidth] = useState<number>(thickness.current);

    if(lastMode !== pixelated) {
        const width = pixelated ? 1 : 5;
        thickness.current = width;
        setLineWidth(width);
        setLastMode(pixelated);
    }

    const onLineWidthChange = useCallback((lineWidth: number) => {
        thickness.current = lineWidth;
        setLineWidth(lineWidth);
    }, [thickness]);

    return(
        <label className="flex items-center flex-col gap-1 sm:gap-2 min-w-0 flex-shrink">
            <span className="bg-gray-300 px-1.5 sm:px-2.5 py-0.5 rounded-md text-xs sm:text-sm whitespace-nowrap">Width {lineWidth}</span>
            <input type="range" min="1" max={pixelated ? "5" :"100"} step="1" value={lineWidth} onChange={(e) => {onLineWidthChange(Number.parseInt(e.target.value))}} className="w-20 sm:w-32 h-2 bg-gray-300 rounded-lg cursor-pointer accent-gray-700" />
        </label>
    );
};

export default WidthSelector;
