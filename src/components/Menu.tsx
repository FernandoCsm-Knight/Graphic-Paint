import { LuGripHorizontal } from "react-icons/lu";
import { useDraggable } from "../hooks/useDraggable";
import ColorSelector from "./menu/ColorSelector";
import EraserButton from "./menu/EraserButton";
import FillButton from "./menu/FillButton";
import WidthSelector from "./menu/WidthSelector";
import MenuTitle from "./menu/MenuTitle";
import { useContext } from "react";
import ShapeSelector from "./menu/ShapeSelector";
import { MenuContext } from "../context/MenuContext";
import ShapesButton from "./menu/ShapesButton";
import SettingsButton from "./menu/SettingsButton";
import SettingsMenu from "./menu/SettingsMenu";
import SelectionButton from "./menu/SelectionButton";

const Menu = () => {
    const { shapeMenu, settingsMenu } = useContext(MenuContext)!;
    const draggable = useDraggable({ initial: "center", clamp: true });

    return(
        <header>
            <div
                ref={draggable.ref}
                className="absolute z-50 rounded-xl shadow-lg bg-gray-200/30 backdrop-blur-sm max-w-[95vw] max-h-[95vh] overflow-hidden"
                style={draggable.style}
            >
                <div className="relative flex items-center gap-2 sm:gap-3 p-2 sm:p-4 flex-wrap sm:flex-nowrap">
                    <MenuTitle/>
                    <ColorSelector/>
                    <EraserButton/>
                    <ShapesButton/>
                    <SelectionButton/>
                    <FillButton/>
                    <WidthSelector/>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onPointerDown={draggable.onPointerDown}
                            className="block cursor-grab active:cursor-grabbing touch-none select-none"
                            aria-label="Drag to move"
                        >
                            <LuGripHorizontal className="text-gray-500 sm:h-5 sm:w-5 h-4 w-4"/>
                        </button>
                        <SettingsButton/>
                    </div>
                </div>
            </div>

            { shapeMenu ? <ShapeSelector /> : null }
            { settingsMenu ? <SettingsMenu /> : null }
        </header>
    );
};

export default Menu;
