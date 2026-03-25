'use client';

import { LuEraser } from "react-icons/lu";
import { useContext } from "react";
import WorkspaceToolButton from "@/components/WorkspaceToolButton";
import { PaintContext } from "../../../../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";

const EraserButton = () => {
    const { isEraserActive, setEraser, setFill, setSelectionActive, setSelectedShape } = useContext(PaintContext)!;
    const { setPanModeActive } = useWorkspaceContext();

    const handleClick = () => {
        const next = !isEraserActive;
        setEraser(next);
        if (next) {
            setFill(false);
            setSelectionActive(false);
            setPanModeActive(false);
            setSelectedShape('freeform');
        }
    };

    return (
        <WorkspaceToolButton
            onClick={handleClick}
            stayActive
            active={isEraserActive}
            ariaLabel={isEraserActive ? "Desativar borracha" : "Ativar borracha"}
        >
            <LuEraser className="ui-icon" />
        </WorkspaceToolButton>
    );
};

export default EraserButton
