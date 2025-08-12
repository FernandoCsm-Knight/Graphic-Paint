import { createContext, type RefObject } from "react";

export type PaintContextType = {
    pixelated: boolean;
    isEraserActive: RefObject<boolean>;
    currentColor: RefObject<string>;
    thickness: RefObject<number>;

    setPixelated: (value: boolean) => void;
};

export const PaintContext = createContext<PaintContextType | undefined>(undefined);

