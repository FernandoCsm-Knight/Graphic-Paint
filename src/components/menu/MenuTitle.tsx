import { useContext } from "react";
import { PaintContext } from "../../context/PaintContext";

const MenuTitle = () => {
    const { pixelated, setPixelated } = useContext(PaintContext)!;
    
    return(
        <div className="flex gap-0 items-stretch min-w-0 flex-shrink-0">
            <h1 className="font-bold text-lg border-r-3 rounded-l-md px-2 sm:px-4 py-2 text-center bg-gray-300 whitespace-nowrap">Paint</h1>
            <button onClick={() => {setPixelated(!pixelated);}} className="cursor-pointer px-2 sm:px-3 py-2 rounded-r-md text-xs sm:text-sm bg-gray-300 hover:bg-gray-200 active:outline-none active:ring-2 active:ring-gray-400 whitespace-nowrap">
                {pixelated ? 'pixelated' : 'freehand'}
            </button>
        </div>
    );
};

export default MenuTitle;