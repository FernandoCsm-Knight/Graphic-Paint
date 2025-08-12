import { useContext, useState, type ChangeEvent } from "react";
import { Eraser, GripHorizontal } from "lucide-react";
import { PaintContext } from "../context/PaintContext";
import { useDraggable } from "../hooks/useDraggable";

type MenuProps = {
    onColorChanged: (color: string) => void;
    onLineWidthChange: (lineWidth: number) => void;
};

const Menu = (
    { onColorChanged, onLineWidthChange }: MenuProps
) => {
    const { pixelated, setPixelated, isEraserActive, thickness, currentColor } = useContext(PaintContext)!;

    const [lineWidth, setLineWidth] = useState<number>(thickness.current);
    const [eraserActive, setEraserActive] = useState<boolean>(isEraserActive.current);

    const handleColor = (e: ChangeEvent<HTMLInputElement>) => {
        onColorChanged(e.target.value);
    };

    const handleEraser = () => {
        isEraserActive.current = !isEraserActive.current;
        setEraserActive(isEraserActive.current);
    }

    const handleLineWidth = (e: ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(e.target.value);
        onLineWidthChange(value);
        setLineWidth(value);
    };

    const draggable = useDraggable({ initial: "center", clamp: true });

    return(
        <header
            ref={draggable.ref}
            className="absolute z-50 rounded-xl shadow-lg bg-gray-200/30 backdrop-blur-sm"
            style={draggable.style}
        >
            <div className="relative flex items-center gap-4 p-4">
                <div className="flex gap-0 items-stretch">
                    <h1 className="font-bold text-3xl border-r-3 rounded-l-md px-5 py-2 text-center bg-gray-300">Paint</h1>
                    <button onClick={() => {setPixelated(!pixelated);}} className="cursor-pointer px-4 py-2 rounded-r-md text-xl bg-gray-300 hover:bg-gray-200 active:outline-none active:ring-2 active:ring-gray-400">
                        {pixelated ? 'pixelated' : 'freehand'}
                    </button>
                </div>
                <label className="relative overflow-hidden rounded-full w-10 h-10 ml-2 border-2 border-gray-900">
                    <input defaultValue={currentColor.current} onChange={handleColor} type="color" className="absolute top-1/2 left-1/2 -translate-1/2 w-13 h-13 p-0 border-none cursor-pointer" aria-label="select color"/>
                </label>
                <button
                    onClick={handleEraser}
                    className={`cursor-pointer p-2.5 rounded-md transition-colors duration-200 ${
                        eraserActive
                            ? 'bg-red-400 hover:bg-red-300 ring-2 ring-red-500'
                            : 'bg-gray-300 hover:bg-gray-200 active:outline-none active:ring-2 active:ring-gray-400'
                    }`}
                    aria-label={eraserActive ? "Desativar borracha" : "Ativar borracha"}
                >
                    <Eraser className={eraserActive ? 'text-white' : 'text-gray-700'} />
                </button>
                <label className="flex items-center flex-col gap-2">
                    <span className="bg-gray-300 px-2.5 py-0.5 rounded-md">Width {lineWidth}</span>
                    <input type="range" min="1" max="100" step="1" defaultValue={lineWidth} onChange={handleLineWidth} className="w-32 h-2 bg-gray-300 rounded-lg cursor-pointer accent-gray-700" />
                </label>

                <div className="w-3">
                    <button
                        onPointerDown={draggable.onPointerDown}
                        className="absolute right-1 top-1 cursor-grab active:cursor-grabbing touch-none select-none"
                        aria-label="Drag to move"
                    >
                        <GripHorizontal className="text-gray-500"/>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Menu;
