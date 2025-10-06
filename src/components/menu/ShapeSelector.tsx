import { useContext, useCallback } from "react";
import GlassCard from "./GlassCard";
import { MenuContext } from "../../context/MenuContext";
import PaintButton from "../PaintButton";
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
    LuSlash,
} from "react-icons/lu";
import { PaintContext } from "../../context/PaintContext";
import type { Geometric } from "../../types/Graphics";
import { BsHeptagon } from "react-icons/bs";
import { TbOvalVertical } from "react-icons/tb";

const ShapeSelector = () => {
    const { shapeButtonRef } = useContext(MenuContext)!;
    const { x, y } = shapeButtonRef.current?.getBoundingClientRect() ?? { x: 0, y: 0 };
    const height = shapeButtonRef.current?.offsetHeight ?? 0;

    const { selectedShape, setSelectedShape } = useContext(PaintContext)!;

    const onSelect = useCallback((key: Geometric) => {
        setSelectedShape(selectedShape !== key ? key : 'freeform');
    }, [ selectedShape, setSelectedShape ]);

    return (
        <GlassCard initial={{ x: x, y: y + height + 10 }}>
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="bg-gray-200 shadow-lg rounded-xl overflow-hidden p-3">
                    <div className="scrollbar overflow-y-auto grid grid-cols-3 gap-2 py-2 sm:py-3 pr-2 sm:pr-3 pl-2 sm:pl-3 sm:gap-3 max-h-28 sm:max-h-41">
                        {[
                            { key: 'circle', icon: <LuCircle className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'square', icon: <LuSquare className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'triangle', icon: <LuTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'diamond', icon: <LuDiamond className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'pentagon', icon: <LuPentagon className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'hexagon', icon: <LuHexagon className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'heptagon', icon: <BsHeptagon className="w-4 h-4 sm:w-5 sm:h-5"/>},
                            { key: 'octagon', icon: <LuOctagon className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'star', icon: <LuStar className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'rect', icon: <LuRectangleHorizontal className="w-4 h-4 sm:w-5 sm:h-5" /> },
                            { key: 'ellipse', icon: <TbOvalVertical className="w-4 h-4 sm:w-5 sm:h-5" />}
                        ].map(({ key, icon }) => (
                            <PaintButton
                                key={key}
                                ariaLabel={`Selecionar forma ${key}`}
                                onClick={() => onSelect(key as Geometric)}
                                active={selectedShape === key}
                                stayActive
                            >
                                {icon}
                            </PaintButton>
                        ))}
                    </div>
                </div>
                <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 sm:gap-3">
                    <PaintButton
                        ariaLabel="Selecionar reta"
                        onClick={() => onSelect('line')}
                        active={selectedShape === 'line'}
                        stayActive
                    >
                        <LuSlash className="w-4 h-4 sm:w-5 sm:h-5" /> 
                    </PaintButton>
                    <PaintButton
                        ariaLabel="Selecionar seta diagonal"
                        onClick={() => onSelect('arrow')}
                        active={selectedShape === 'arrow'}
                        stayActive
                    >
                        <LuArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </PaintButton>
                </div>
            </div>
        </GlassCard>
    );
};

export default ShapeSelector;