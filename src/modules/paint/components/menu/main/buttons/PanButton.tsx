import { useContext } from "react";
import { LuHand } from "react-icons/lu";
import { PaintContext } from "../../../../context/PaintContext";
import { useWorkspaceContext } from "../../../../../../context/WorkspaceContext";
import WorkspaceToolButton from "../../../../../../components/WorkspaceToolButton";

const PanButton = () => {
    const { setEraser, setFill, setSelectionActive, setSelectedShape } = useContext(PaintContext)!;
    const { isPanModeActive, setPanModeActive } = useWorkspaceContext();

    const handleClick = () => {
        const next = !isPanModeActive;
        setPanModeActive(next);
        if (next) {
            setEraser(false);
            setFill(false);
            setSelectionActive(false);
            setSelectedShape('freeform');
            document.body.style.cursor = 'default';
        }
    };

    return (
        <WorkspaceToolButton
            onClick={handleClick}
            stayActive
            active={isPanModeActive}
            ariaLabel={isPanModeActive ? "Desativar arraste do canvas" : "Ativar arraste do canvas"}
        >
            <LuHand className="ui-icon" />
        </WorkspaceToolButton>
    );
};

export default PanButton;
