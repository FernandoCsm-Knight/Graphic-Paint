'use client';

import { LuGripHorizontal } from "react-icons/lu"; 
import ColorSelector from "./ColorSelector";
import WidthSelector from "./WidthSelector";
import MenuTitleCard from "@/components/MenuTitleCard";
import { useContext, useEffect } from "react";
import ShapeSelector from "./ShapeSelector";
import StrokeStyleSelector from "./StrokeStyleSelector";
import { MenuContext } from "../../../../_context/MenuContext";
import { PaintContext } from "../../../../_context/PaintContext";
import SettingsButton from "../../settings/ui/SettingsButton";
import SettingsMenu from "../../settings/ui/SettingsMenu";
import EraserButton from "../buttons/EraserButton";
import ShapesButton from "../buttons/ShapesButton";
import SelectionButton from "../buttons/SelectionButton";
import PanButton from "../buttons/PanButton";
import FillButton from "../buttons/FillButton";
import StrokeStyleButton from "../buttons/StrokeStyleButton";
import { useDraggable } from "@/hooks/useDraggable";

const Menu = () => {
    const { shapeMenu, settingsMenu, strokeStyleMenu, setStrokeStyleMenu } = useContext(MenuContext)!;
    const { pixelated, setPixelated } = useContext(PaintContext)!;

    // Close the stroke style panel when switching to pixelated mode
    useEffect(() => {
        if (pixelated && strokeStyleMenu) setStrokeStyleMenu(false);
    }, [pixelated, strokeStyleMenu, setStrokeStyleMenu]);
    const { elementRef, dragStyle, handlePointerDown } = useDraggable({ clamp: true, referenceFrame: "offsetParent" });

    return(
        <header>
            <div
                data-paint-menu="true"
                ref={elementRef}
                className="ui-menu-shell absolute z-35 rounded-xl backdrop-blur-sm max-w-[95vw] max-h-[95vh] overflow-hidden"
                style={dragStyle}
            >
                <div className="relative min-w-fit flex flex-col sm:flex-row sm:items-center gap-[var(--pm-gap)] p-[var(--pm-pad)]">
                    {/* Row 1 (mobile) / first item (desktop): title card */}
                    <MenuTitleCard
                        title="Paint"
                        badge={pixelated ? 'Pixel' : 'Livre'}
                        segments={[
                            { label: 'Freehand', active: !pixelated, onClick: () => setPixelated(false) },
                            { label: 'Pixelado', active: pixelated, onClick: () => setPixelated(true) },
                        ]}
                    />

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
                                onPointerDown={handlePointerDown}
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
