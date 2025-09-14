import { useCallback, useContext } from "react";
import { PaintContext } from "../../context/PaintContext";

const ColorSelector = () => {
    const { contextRef, currentColor } = useContext(PaintContext)!;

    const onColorChanged = useCallback((color: string) => {
        currentColor.current = color;
        const ctx = contextRef.current;
        if(ctx) {
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
    }, [currentColor, contextRef]);

    return (
        <label className="relative overflow-hidden rounded-full w-8 h-8 sm:w-10 sm:h-10 mx-1 sm:mx-2 border-2 border-gray-900 flex-shrink-0">
            <input defaultValue={currentColor.current} onChange={(e) => {onColorChanged(e.target.value)}} type="color" className="absolute top-1/2 left-1/2 -translate-1/2 w-10 sm:w-13 h-10 sm:h-13 p-0 border-none cursor-pointer" aria-label="select color"/>
        </label>
    );
};

export default ColorSelector;