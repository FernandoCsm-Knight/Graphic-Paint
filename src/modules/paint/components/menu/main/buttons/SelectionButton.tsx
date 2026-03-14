import { useContext } from "react";
import { LuCrop } from "react-icons/lu";
import { PaintContext } from "../../../../context/PaintContext";
import WorkspaceToolButton from "../../../../../../components/WorkspaceToolButton";


const SelectionButton = () => {
    const { isSelectionActive, setSelectionActive, setFill, setEraser, setPanModeActive, setSelectedShape } = useContext(PaintContext)!;

    const handleClick = () => {
        const next = !isSelectionActive;
        setSelectionActive(next);
        document.body.style.cursor = next ? 'crosshair' : 'default';
        if (next) {
            setFill(false);
            setEraser(false);
            setPanModeActive(false);
            setSelectedShape('freeform');
        }
    };

    return (
        <WorkspaceToolButton onClick={handleClick} stayActive active={isSelectionActive} ariaLabel={isSelectionActive ? 'Desativar seleção' : 'Ativar seleção'}>
            <LuCrop className="ui-icon"/>
        </WorkspaceToolButton>
    );
};

export default SelectionButton;
