import { LuPaintBucket } from "react-icons/lu";
import { useContext } from "react";
import { PaintContext } from "../../../../context/PaintContext";
import WorkspaceToolButton from "../../../../../../components/WorkspaceToolButton";
import { useWorkspaceContext } from "../../../../../../context/WorkspaceContext";

// Paint-bucket SVG cursor — hotspot at the pour tip (bottom-left of the bucket)
const FILL_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m19 11-8-8-8.5 8.5a5.5 5.5 0 0 0 7.78 7.78L19 11Z'/%3E%3Cpath d='m5 2 5 5'/%3E%3Cpath d='M2 13h15'/%3E%3Cpath d='M22 20a2 2 0 0 1-4 0c0-1.6 2-3.6 2-3.6s2 2 2 3.6z'/%3E%3C/svg%3E") 3 20, crosshair`;

const FillButton = () => {
    const { isFillActive, setFill, setEraser, setSelectionActive, setSelectedShape, canvasRef, toolCursor } = useContext(PaintContext)!;
    const { setPanModeActive } = useWorkspaceContext();

    const handleClick = () => {
        const next = !isFillActive;
        setFill(next);
        const cursor = next ? FILL_CURSOR : "";
        toolCursor.current = cursor;
        if (canvasRef.current) canvasRef.current.style.cursor = cursor;
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
