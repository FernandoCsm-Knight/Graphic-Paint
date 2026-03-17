import { LuGripHorizontal } from "react-icons/lu"; 
import ColorSelector from "./ColorSelector";
import WidthSelector from "./WidthSelector";
import MenuTitle from "./MenuTitle";
import { useContext, useEffect } from "react";
import ShapeSelector from "./ShapeSelector";
import StrokeStyleSelector from "./StrokeStyleSelector";
import { MenuContext } from "../../../../context/MenuContext";
import { PaintContext } from "../../../../context/PaintContext";
import SettingsButton from "../../settings/ui/SettingsButton";
import SettingsMenu from "../../settings/ui/SettingsMenu";
import EraserButton from "../buttons/EraserButton";
import ShapesButton from "../buttons/ShapesButton";
import SelectionButton from "../buttons/SelectionButton";
import PanButton from "../buttons/PanButton";
import FillButton from "../buttons/FillButton";
import StrokeStyleButton from "../buttons/StrokeStyleButton";
import { useDraggable } from "../../../../../../hooks/useDraggable";

const Menu = () => {
    const { shapeMenu, settingsMenu, strokeStyleMenu, setStrokeStyleMenu } = useContext(MenuContext)!;
    const { pixelated } = useContext(PaintContext)!;

    // Close the stroke style panel when switching to pixelated mode
    useEffect(() => {
        if (pixelated && strokeStyleMenu) setStrokeStyleMenu(false);
    }, [pixelated, strokeStyleMenu, setStrokeStyleMenu]);
    const draggable = useDraggable({ clamp: true, referenceFrame: "offsetParent" });

    return(
        <header>
            <div
                data-paint-menu="true"
                ref={draggable.ref}
                className="ui-menu-shell absolute z-15 rounded-xl backdrop-blur-sm max-w-[95vw] max-h-[95vh] overflow-hidden"
                style={draggable.style}
            >
                <div className="relative min-w-fit flex flex-col sm:flex-row sm:items-center gap-[var(--pm-gap)] p-[var(--pm-pad)]">
                    {/* Row 1 (mobile) / first item (desktop): title card */}
                    <MenuTitle/>

                    {/* Row 2 (mobile) / rest of items (desktop): controls */}
                    <div className="flex items-center gap-[var(--pm-gap)] min-w-fit">
                        <div className="flex flex-col grow items-center gap-[var(--pm-gap)] min-w-fit">
                            <div className="flex grow items-center gap-[var(--pm-gap)] min-w-fit">
                                <ColorSelector/>
                                <EraserButton/>
                                <ShapesButton/>
                                { !pixelated && <StrokeStyleButton/> }
                                <SelectionButton/>
                                <PanButton/>
                                <FillButton/>
                            </div>
                            <WidthSelector/>
                        </div>
                        <div className="flex flex-col items-center gap-[var(--pm-gap)] ml-auto">
                            <button
                                onPointerDown={draggable.onPointerDown}
                                className="block cursor-grab active:cursor-grabbing touch-none select-none"
                                aria-label="Drag to move"
                            >
                                <LuGripHorizontal className="ui-drag-handle ui-icon"/>
                            </button>
                            <SettingsButton/>
                        </div>
                    </div>
                </div>
            </div>

            { shapeMenu ? <ShapeSelector /> : null }
            { settingsMenu ? <SettingsMenu /> : null }
            { strokeStyleMenu ? <StrokeStyleSelector /> : null }
        </header>
    );
};

export default Menu;
