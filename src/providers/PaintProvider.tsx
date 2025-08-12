import { useRef, useState } from "react";
import { PaintContext, type PaintContextType } from "../context/PaintContext";

type PaintProviderProps = {
    children: React.ReactNode;
};

const PaintProvider = ({ children }: PaintProviderProps) => {
    const [pixelated, setPixelated] = useState<boolean>(false);
    
    const isEraserActive = useRef<boolean>(false);
    const thickness = useRef<number>(5);
    const currentColor = useRef<string>('#000000');

    const paintContext: PaintContextType = {
        pixelated: pixelated,
        isEraserActive: isEraserActive,
        currentColor: currentColor,
        thickness: thickness,

        setPixelated: setPixelated,
    }

    return (
        <PaintContext.Provider value={paintContext}>
            { children }
        </PaintContext.Provider>
    );
};

export default PaintProvider;
