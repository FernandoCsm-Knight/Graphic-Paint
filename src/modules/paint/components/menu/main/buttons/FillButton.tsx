import { LuPaintBucket } from "react-icons/lu";
import { useContext } from "react";
import { PaintContext } from "../../../../context/PaintContext";
import WorkspaceToolButton from "../../../../../../components/WorkspaceToolButton";

const FillButton = () => {
    const { isFillActive, setFill, setEraser, setPanModeActive, setSelectionActive, setSelectedShape } = useContext(PaintContext)!;

    const handleClick = () => {
        const next = !isFillActive;
        setFill(next);
        document.body.style.cursor = next ? 'crosshair' : 'default';
        if (next) {
            setEraser(false);
            setPanModeActive(false);
            setSelectionActive(false);
            setSelectedShape('freeform');
        }
    };

    return (
        <WorkspaceToolButton onClick={handleClick} stayActive active={isFillActive}>
            <LuPaintBucket className="ui-icon"/>
        </WorkspaceToolButton>
    );
};

export default FillButton;
