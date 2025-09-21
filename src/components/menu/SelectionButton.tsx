import { useContext } from "react";
import { LuCrop } from "react-icons/lu";
import { PaintContext } from "../../context/PaintContext";
import PaintButton from "../PaintButton";

const SelectionButton = () => {
    const { isSelectionActive, setSelectionActive, setFill, setEraser } = useContext(PaintContext)!;

    const handleClick = () => {
        const next = !isSelectionActive;
        setSelectionActive(next);
        if (next) {
            // turn off other mutually-exclusive tools
            setFill(false);
            setEraser(false);
        }
        document.body.style.cursor = next ? 'crosshair' : 'default';
    };

    return (
        <PaintButton onClick={handleClick} stayActive active={isSelectionActive} ariaLabel={isSelectionActive ? 'Desativar seleção' : 'Ativar seleção'}>
            <LuCrop className="text-gray-700 w-4 h-4 sm:w-5 sm:h-5"/>
        </PaintButton>
    );
};

export default SelectionButton;
