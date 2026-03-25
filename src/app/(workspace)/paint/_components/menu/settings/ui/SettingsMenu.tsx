'use client';


import { useContext } from "react";
import { PaintContext } from "../../../../_context/PaintContext";
import PixelatedSettings from "../PixelatedSettings";
import StandardSettings from "../StandardSettings";

const SettingsMenu = () => {
    const { pixelated } = useContext(PaintContext)!;

    if(!pixelated) {
        return (
            <StandardSettings/>
        );
    }

    return (
        <PixelatedSettings/>
    );
};

export default SettingsMenu;
