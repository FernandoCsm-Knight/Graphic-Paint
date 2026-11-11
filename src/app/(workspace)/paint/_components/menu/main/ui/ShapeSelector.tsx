'use client';

import { useContext, useCallback } from "react";
import { MenuContext } from "../../../../_context/MenuContext";
import WorkspaceToolButton from "@/components/WorkspaceToolButton";
import {
    LuCircle,
    LuSquare,
    LuTriangle,
    LuHexagon,
    LuOctagon,
    LuDiamond,
    LuPentagon,
    LuStar,
    LuRectangleHorizontal,
    LuArrowUpRight,
    LuSlash
} from "react-icons/lu";
import { PaintContext } from "../../../../_context/PaintContext";
import type { Geometric } from "../../../../_types/Graphics";
import { BsHeptagon } from "react-icons/bs";
import { TbOvalVertical, TbPolygon, TbVectorBezier2, TbVectorSpline } from "react-icons/tb";
import GlassCard from "@/components/GlassCard";
import type { Point } from "@/types/geometry";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { getPanelPositionBelow } from "./panelPosition";

const ShapeSelector = () => {
    const { shapeButtonRef } = useContext(MenuContext)!;
    const { selectedShape, setSelectedShape, setFill, setSelectionActive } = useContext(PaintContext)!;
    const { setPanModeActive } = useWorkspaceContext();

    const getInitialPos = (): Point => getPanelPositionBelow(shapeButtonRef.current);

    const onSelect = useCallback((key: Geometric) => {
        const next = selectedShape !== key ? key : 'freeform';
        setSelectedShape(next);
        if (next !== 'freeform') {
            setPanModeActive(false);
            setFill(false);
            setSelectionActive(false);
        }
    }, [selectedShape, setSelectedShape, setPanModeActive, setFill, setSelectionActive]);

    return (
        <GlassCard initial={getInitialPos}>
            <div className="p-[var(--pm-pad)] pb-0">
                <div className="ui-floating-card-inner shadow-lg rounded-xl overflow-hidden p-[var(--pm-btn-pad)]">
                    <div>
                        {/* All shapes visible (no inner scroll, which pushed icons off-centre and hid the last row). */}
                        <div className="grid grid-cols-3 place-items-center gap-[var(--pm-gap)] p-[var(--pm-btn-pad)]">
                            {[
                                { key: 'circle', icon: <LuCircle className="ui-icon" /> },
                                { key: 'square', icon: <LuSquare className="ui-icon" /> },
                                { key: 'triangle', icon: <LuTriangle className="ui-icon" /> },
                                { key: 'diamond', icon: <LuDiamond className="ui-icon" /> },
                                { key: 'pentagon', icon: <LuPentagon className="ui-icon" /> },
                                { key: 'hexagon', icon: <LuHexagon className="ui-icon" /> },
                                { key: 'heptagon', icon: <BsHeptagon className="ui-icon"/>},
                                { key: 'octagon', icon: <LuOctagon className="ui-icon" /> },
                                { key: 'star', icon: <LuStar className="ui-icon" /> },
                                { key: 'rect', icon: <LuRectangleHorizontal className="ui-icon" /> },
                                { key: 'ellipse', icon: <TbOvalVertical className="ui-icon" />}
                            ].map(({ key, icon }) => (
                                <WorkspaceToolButton
                                    key={key}
                                    className="aspect-square"
                                    ariaLabel={`Selecionar forma ${key}`}
                                    onClick={() => onSelect(key as Geometric)}
                                    active={selectedShape === key}
                                    stayActive
                                >
                                    {icon}
                                </WorkspaceToolButton>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-[var(--pm-gap)] flex items-center justify-center gap-[var(--pm-gap)]">
                    <WorkspaceToolButton
                        ariaLabel="Selecionar reta"
                        onClick={() => onSelect('line')}
                        active={selectedShape === 'line'}
                        stayActive
                    >
                        <LuSlash className="ui-icon" />
                    </WorkspaceToolButton>
                    <WorkspaceToolButton
                        ariaLabel="Selecionar seta diagonal"
                        onClick={() => onSelect('arrow')}
                        active={selectedShape === 'arrow'}
                        stayActive
                    >
                        <LuArrowUpRight className="ui-icon" />
                    </WorkspaceToolButton>
                    <WorkspaceToolButton
                        ariaLabel="Polígono livre (clique para adicionar vértices)"
                        onClick={() => onSelect('polygon')}
                        active={selectedShape === 'polygon'}
                        stayActive
                    >
                        <TbPolygon className="ui-icon" />
                    </WorkspaceToolButton>
                    <WorkspaceToolButton
                        ariaLabel="Curva de Bézier (clique para pontos de controle, duplo-clique para finalizar)"
                        onClick={() => onSelect('bezier')}
                        active={selectedShape === 'bezier'}
                        stayActive
                    >
                        <TbVectorBezier2 className="ui-icon" />
                    </WorkspaceToolButton>
                    <WorkspaceToolButton
                        ariaLabel="B-spline cúbica (clique para pontos de controle, duplo-clique para finalizar)"
                        onClick={() => onSelect('bspline')}
                        active={selectedShape === 'bspline'}
                        stayActive
                    >
                        <TbVectorSpline className="ui-icon" />
                    </WorkspaceToolButton>
                </div>
            </div>
        </GlassCard>
    );
};

export default ShapeSelector;
