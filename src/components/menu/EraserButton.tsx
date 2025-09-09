import { Eraser } from "lucide-react";
import { useContext } from "react";
import { PaintContext } from "../../context/PaintContext";

const EraserButton = () => {
    const { isEraserActive, setEraser } = useContext(PaintContext)!;

    return (
        <button
            onClick={() => setEraser(!isEraserActive)}
            className={`cursor-pointer p-1.5 sm:p-2.5 rounded-md transition-colors duration-200 flex-shrink-0 ${
                isEraserActive
                    ? 'bg-red-400 hover:bg-red-300 ring-2 ring-red-500'
                    : 'bg-gray-300 hover:bg-gray-200 active:outline-none active:ring-2 active:ring-gray-400'
            }`}
            aria-label={isEraserActive ? "Desativar borracha" : "Ativar borracha"}
        >
            <Eraser className={`${isEraserActive ? 'text-white' : 'text-gray-700'} w-4 h-4 sm:w-5 sm:h-5`} />
        </button>
    );
};

export default EraserButton