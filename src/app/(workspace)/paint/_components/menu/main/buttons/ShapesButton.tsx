'use client';

import { useContext } from "react";
import { LuShapes } from "react-icons/lu";
import { MenuContext } from "../../../../_context/MenuContext";
import { PaintContext } from "../../../../_context/PaintContext";
import WorkspaceToolButton from "@/components/WorkspaceToolButton";

const ShapesButton = () => {
    const { shapeButtonRef, shapeMenu, setShapeMenu } = useContext(MenuContext)!;
    const { setSelectedShape } = useContext(PaintContext)!;

    const onMenuToggle = () => {
        if(shapeMenu) setSelectedShape('freeform');
        setShapeMenu(!shapeMenu);
    };

    return (
        <WorkspaceToolButton ref={shapeButtonRef} onClick={onMenuToggle} stayActive>
            <LuShapes className="ui-icon"/>
        </WorkspaceToolButton>
    );
};

export default ShapesButton;
