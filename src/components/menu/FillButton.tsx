import { PaintBucket } from "lucide-react";
import { useCallback, useContext, useState } from "react";
import { PaintContext } from "../../context/PaintContext";
import PaintButton from "../PaintButton";

const FillButton = () => {
    const { isFillActive } = useContext(PaintContext)!;
    const [isActive, setIsActive] = useState<boolean>(false);

    const handleFillToggle = useCallback(() => {
        const newState = !isActive;
        setIsActive(newState);
        isFillActive.current = newState;
    }, [isFillActive, isActive]);

    return (
        <PaintButton onClick={handleFillToggle} stayActive active={isActive}>
            <PaintBucket className="text-gray-700 w-4 h-4 sm:w-5 sm:h-5"/>
        </PaintButton>
    );
};

export default FillButton;
