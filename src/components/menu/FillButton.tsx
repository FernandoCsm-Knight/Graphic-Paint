import { PaintBucket } from "lucide-react";
import { useContext } from "react";
import { PaintContext } from "../../context/PaintContext";
import PaintButton from "../PaintButton";

const FillButton = () => {
    const { isFillActive, setFill } = useContext(PaintContext)!;

    return (
        <PaintButton onClick={() => setFill(!isFillActive)} stayActive active={isFillActive}>
            <PaintBucket className="text-gray-700 w-4 h-4 sm:w-5 sm:h-5"/>
        </PaintButton>
    );
};

export default FillButton;
