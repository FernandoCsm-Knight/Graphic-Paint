import { LuPaintBucket } from "react-icons/lu";
import { useContext } from "react";
import { PaintContext } from "../../context/PaintContext";
import PaintButton from "../PaintButton";

const FillButton = () => {
    const { isFillActive, setFill } = useContext(PaintContext)!;

    const handleClick = () => {
        setFill(!isFillActive);
        document.body.style.cursor = isFillActive ? 'default' : 'crosshair';
    }

    return (
        <PaintButton onClick={handleClick} stayActive active={isFillActive}>
            <LuPaintBucket className="text-gray-700 w-4 h-4 sm:w-5 sm:h-5"/>
        </PaintButton>
    );
};

export default FillButton;
