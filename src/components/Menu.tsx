import { GripHorizontal, Settings, Shapes } from "lucide-react";
import { useDraggable } from "../hooks/useDraggable";
import ColorSelector from "./menu/ColorSelector";
import EraserButton from "./menu/EraserButton";
import FillButton from "./menu/FillButton";
import WidthSelector from "./menu/WidthSelector";
import MenuTitle from "./menu/MenuTitle";
import PaintButton from "./PaintButton";
import { useContext, useState } from "react";
import ShapeSelector from "./menu/ShapeSelector";
import { MenuContext } from "../context/MenuContext";

const Menu = () => {
    const { shapeButtonRef, settingButtonRef } = useContext(MenuContext)!;
    const [isShapeMenuOpen, setIsShapeMenuOpen] = useState<boolean>(false);

    const draggable = useDraggable({ initial: "center", clamp: true });

    const openShapeMenu = () => {
        setIsShapeMenuOpen(!isShapeMenuOpen);
    };

    return(
        <header>
            <div
                ref={draggable.ref}
                className="absolute z-50 rounded-xl shadow-lg bg-gray-200/30 backdrop-blur-sm max-w-[95vw] max-h-[95vh] overflow-hidden"
                style={draggable.style}
            >
                <div className="relative flex items-center gap-2 sm:gap-4 p-2 sm:p-4 flex-wrap sm:flex-nowrap">
                    <MenuTitle/>
                    <ColorSelector/>
                    <EraserButton/>
                    <PaintButton ref={shapeButtonRef} onClick={openShapeMenu} stayActive>
                        <Shapes className="text-gray-700 w-4 h-4 sm:w-5 sm:h-5"/>
                    </PaintButton>
                    <FillButton/>
                    <WidthSelector/>
                    <div className="flex flex-col gap-1">
                        <button
                            onPointerDown={draggable.onPointerDown}
                            className="block cursor-grab active:cursor-grabbing touch-none select-none"
                            aria-label="Drag to move"
                        >
                            <GripHorizontal className="text-gray-500 sm:h-5 sm:w-5 h-4 w-4"/>
                        </button>
                        <button
                            ref={settingButtonRef}
                            className="block cursor-pointer"
                            aria-label="Open settings"
                        >
                            <Settings className="text-gray-500 sm:h-5 sm:w-5 h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>

            { isShapeMenuOpen ? <ShapeSelector /> : null }
        </header>
    );
};

export default Menu;
