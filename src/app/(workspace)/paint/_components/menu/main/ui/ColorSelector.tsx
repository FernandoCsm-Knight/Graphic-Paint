'use client';

import { useCallback, useContext, useEffect, useState } from "react";
import { PaintContext } from "../../../../_context/PaintContext";

const ColorSelector = () => {
    const { contextRef, currentColorRef } = useContext(PaintContext)!;
    const [selectedColor, setSelectedColor] = useState('#000000');

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setSelectedColor(currentColorRef.current);
        });

        return () => cancelAnimationFrame(frame);
    }, [currentColorRef]);

    const onColorChanged = useCallback((color: string) => {
        setSelectedColor(color);
        currentColorRef.current = color;
        const ctx = contextRef.current;
        if(ctx) {
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
    }, [contextRef, currentColorRef]);

    return (
        <label className="relative overflow-hidden rounded-full w-[var(--pm-color-size)] h-[var(--pm-color-size)] mx-[var(--pm-btn-pad)] border-2 flex-shrink-0" style={{ borderColor: 'var(--ui-menu-border-strong)' }}>
            <input value={selectedColor} onChange={(e) => {onColorChanged(e.target.value)}} type="color" className="absolute top-1/2 left-1/2 -translate-1/2 w-[calc(var(--pm-color-size)*1.3)] h-[calc(var(--pm-color-size)*1.3)] p-0 border-none cursor-pointer" aria-label="select color"/>
        </label>
    );
};

export default ColorSelector;
