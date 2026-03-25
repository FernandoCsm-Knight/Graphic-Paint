'use client';

import { useEffect, useContext } from "react";
import { PaintContext } from "../_context/PaintContext";
import { SettingsContext } from "../_context/SettingsContext";

const ModeManager = () => {
    const { pixelated } = useContext(PaintContext)!;
    const { setPageSizeEraser } = useContext(SettingsContext)!;

    useEffect(() => {
        if(pixelated) setPageSizeEraser(false);
    }, [pixelated, setPageSizeEraser]);

    return null;
};

export default ModeManager;
