import { useCallback, useContext } from "react";
import { ReplacementContext } from "../context/ReplacementContext";
import { SettingsContext } from "../context/SettingsContext";

const useReplacement = () => {
    const { pixelSize } = useContext(SettingsContext)!;

    const { replacementContextRef } = useContext(ReplacementContext)!;

    const clearGrid = useCallback((width: number, height: number) => {
        const ctx = replacementContextRef.current;
        if(!ctx) return;
        
        ctx.clearRect(0, 0, width, height);
    }, [replacementContextRef]);

    const drawGrid = useCallback((width: number, height: number) => {
        const ctx = replacementContextRef.current;
        if(!ctx) return;

        const xCount = Math.floor(width / pixelSize);
        const yCount = Math.floor(height / pixelSize);

        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.strokeStyle = "#dddddd";
        ctx.lineWidth = 1;

        ctx.beginPath();
        for(let i = 0; i <= xCount; i++) {
            const x = i * pixelSize + 0.5;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        ctx.stroke();

        ctx.beginPath();
        for(let i = 0; i <= yCount; i++) {
            const y = i * pixelSize + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
        ctx.restore();
    }, [pixelSize, replacementContextRef]);

    return {
        drawGrid,
        clearGrid
    };
};

export default useReplacement;