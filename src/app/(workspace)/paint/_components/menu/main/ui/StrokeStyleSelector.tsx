'use client';

import { useContext } from "react";
import { MenuContext } from "../../../../_context/MenuContext";
import { SettingsContext, type BrushStyle, type LineDashPreset } from "../../../../_context/SettingsContext";
import { PaintContext } from "../../../../_context/PaintContext";
import GlassCard from "@/components/GlassCard";
import WorkspaceToolButton from "@/components/WorkspaceToolButton";
import type { Point } from "@/types/geometry";
import { TbLineDashed, TbLineDotted, TbSpray } from "react-icons/tb";
import { LuPenTool, LuSlash } from "react-icons/lu";
import { getPanelPositionBelow } from "./panelPosition";

// ── Dash preview SVGs ────────────────────────────────────────────────────────

const DASH_PREVIEWS: Record<LineDashPreset, React.ReactNode> = {
    solid: <LuSlash className="ui-icon" />,
    dashed: <TbLineDashed className="ui-icon" />,
    dotted: <TbLineDotted className="ui-icon" />,
};

const DASH_LABELS: Record<LineDashPreset, string> = {
    solid: "Contínuo",
    dashed: "Tracejado",
    dotted: "Pontilhado"
};

// ── Brush preview SVGs ───────────────────────────────────────────────────────

const BRUSH_PREVIEWS: Record<BrushStyle, React.ReactNode> = {
    smooth: <LuPenTool className="ui-icon"/>,
    hard: <LuSlash className="ui-icon" />,
    spray: <TbSpray className="ui-icon" />,
};

const BRUSH_LABELS: Record<BrushStyle, string> = {
    smooth: "Suave",
    hard: "Duro",
    spray: "Spray",
};

// ── Component ────────────────────────────────────────────────────────────────

const StrokeStyleSelector = () => {
    const { strokeStyleButtonRef } = useContext(MenuContext)!;
    const { lineDashPreset, setLineDashPreset, brushStyle, setBrushStyle } = useContext(SettingsContext)!;
    const { pixelated } = useContext(PaintContext)!;

    const getInitialPos = (): Point => getPanelPositionBelow(strokeStyleButtonRef.current);

    const dashPresets: LineDashPreset[] = ["solid", "dashed", "dotted"];
    const brushStyles: BrushStyle[] = ["smooth", "hard", "spray"];

    return (
        <GlassCard initial={getInitialPos}>
            <div className="p-[var(--pm-pad)] flex flex-col gap-[var(--pm-gap)] pb-0">
                <div className="ui-floating-card-inner shadow-lg rounded-xl p-[var(--pm-btn-pad)]">
                    <div className="flex items-center gap-[var(--pm-gap)]">
                        {dashPresets.map((preset) => (
                            <WorkspaceToolButton
                                key={preset}
                                onClick={() => setLineDashPreset(preset)}
                                active={lineDashPreset === preset}
                                stayActive
                                ariaLabel={DASH_LABELS[preset]}
                                title={DASH_LABELS[preset]}
                            >
                                {DASH_PREVIEWS[preset]}
                            </WorkspaceToolButton>
                        ))}
                    </div>
                </div>

                {!pixelated && (
                    <div className="ui-floating-card-inner shadow-lg rounded-xl p-[var(--pm-btn-pad)]">
                        <div className="flex items-center gap-[var(--pm-gap)]">
                            {brushStyles.map((style) => (
                                <WorkspaceToolButton
                                    key={style}
                                    onClick={() => setBrushStyle(style)}
                                    active={brushStyle === style}
                                    stayActive
                                    ariaLabel={BRUSH_LABELS[style]}
                                    title={BRUSH_LABELS[style]}
                                >
                                    {BRUSH_PREVIEWS[style]}
                                </WorkspaceToolButton>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

export default StrokeStyleSelector;
