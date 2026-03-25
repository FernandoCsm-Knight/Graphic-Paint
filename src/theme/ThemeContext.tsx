'use client';

import { createContext, type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { defaultAppPalette, type AppPalette } from "./palettes";

export type ThemeContextType = {
    palette: AppPalette;
    setActivePalette: React.Dispatch<React.SetStateAction<AppPalette>>;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
    children: ReactNode;
};

const paletteToCssVariables = (palette: AppPalette): CSSProperties => ({
    "--app-shell-text": palette.shell.appText,
    "--app-body-accent-primary": palette.shell.bodyAccentPrimary,
    "--app-body-accent-secondary": palette.shell.bodyAccentSecondary,
    "--app-sidebar-overlay": palette.shell.sidebarOverlay,
    "--app-sidebar-surface": palette.shell.sidebarSurface,
    "--app-sidebar-border": palette.shell.sidebarBorder,
    "--app-sidebar-title": palette.shell.sidebarTitle,
    "--app-sidebar-text": palette.shell.sidebarText,
    "--app-sidebar-text-muted": palette.shell.sidebarTextMuted,
    "--app-accent-text": palette.shell.accentText,
    "--app-accent-text-strong": palette.shell.accentTextStrong,
    "--app-accent-soft": palette.shell.accentSoft,
    "--app-accent-soft-strong": palette.shell.accentSoftStrong,
    "--app-accent-border": palette.shell.accentBorder,
    "--app-accent-border-strong": palette.shell.accentBorderStrong,
    "--app-accent-shadow": palette.shell.accentShadow,
    "--app-module-surface": palette.shell.moduleSurface,
    "--app-module-hover-surface": palette.shell.moduleHoverSurface,
    "--app-module-active-surface": palette.shell.moduleActiveSurface,
    "--app-module-border": palette.shell.moduleBorder,
    "--app-toggle-surface": palette.shell.toggleSurface,
    "--app-toggle-hover-surface": palette.shell.toggleHoverSurface,
    "--app-toggle-border": palette.shell.toggleBorder,
    "--app-toggle-text": palette.shell.toggleText,
    "--app-toggle-shadow": palette.shell.toggleShadow,
    "--app-current-module-surface": palette.shell.currentModuleSurface,
    "--app-status-available-bg": palette.shell.statusAvailableBg,
    "--app-status-available-text": palette.shell.statusAvailableText,
    "--app-status-soon-bg": palette.shell.statusSoonBg,
    "--app-status-soon-text": palette.shell.statusSoonText,
    "--app-mobile-pill-surface": palette.shell.mobilePillSurface,
    "--app-mobile-pill-border": palette.shell.mobilePillBorder,
    "--app-workspace-gradient": palette.shell.workspaceGradient,
    "--ui-menu-surface": palette.ui.menuSurface,
    "--ui-menu-card-surface": palette.ui.menuCardSurface,
    "--ui-menu-border": palette.ui.menuBorder,
    "--ui-menu-border-strong": palette.ui.menuBorderStrong,
    "--ui-menu-text": palette.ui.menuText,
    "--ui-menu-text-muted": palette.ui.menuTextMuted,
    "--ui-menu-text-strong": palette.ui.menuTextStrong,
    "--ui-menu-handle": palette.ui.menuHandle,
    "--ui-menu-control-surface": palette.ui.menuControlSurface,
    "--ui-menu-control-hover-surface": palette.ui.menuControlHoverSurface,
    "--ui-menu-control-active-surface": palette.ui.menuControlActiveSurface,
    "--ui-menu-control-ring": palette.ui.menuControlRing,
    "--ui-menu-control-text": palette.ui.menuControlText,
    "--ui-menu-control-text-active": palette.ui.menuControlTextActive,
    "--ui-menu-segment-surface": palette.ui.menuSegmentSurface,
    "--ui-menu-segment-hover-surface": palette.ui.menuSegmentHoverSurface,
    "--ui-menu-segment-active-surface": palette.ui.menuSegmentActiveSurface,
    "--ui-menu-segment-text": palette.ui.menuSegmentText,
    "--ui-menu-segment-text-active": palette.ui.menuSegmentTextActive,
    "--ui-input-surface": palette.ui.inputSurface,
    "--ui-input-surface-muted": palette.ui.inputSurfaceMuted,
    "--ui-input-border": palette.ui.inputBorder,
    "--ui-input-text": palette.ui.inputText,
    "--ui-input-muted": palette.ui.inputMuted,
    "--ui-focus-ring": palette.ui.focusRing,
    "--ui-slider-thumb": palette.ui.sliderThumb,
    "--ui-slider-thumb-hover": palette.ui.sliderThumbHover,
    "--workspace-grid-line": palette.ui.menuBorder,
    "--graph-edge": palette.ui.menuBorderStrong,
    "--graph-edge-selected": palette.ui.menuControlActiveSurface,
    "--graph-edge-visited": palette.shell.accentBorderStrong,
    "--graph-edge-preview": palette.ui.menuHandle,
    "--graph-edge-label": palette.ui.menuTextMuted,
    "--graph-node-fill": palette.ui.menuTextStrong,
    "--graph-node-stroke": palette.ui.menuBorderStrong,
    "--graph-node-text": palette.ui.menuCardSurface,
    "--graph-node-badge": palette.ui.menuTextMuted,
} as CSSProperties);

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [activePalette, setActivePalette] = useState<AppPalette>(defaultAppPalette);

    const value = useMemo(
        () => ({ palette: activePalette, setActivePalette }),
        [activePalette],
    );

    return (
        <ThemeContext.Provider value={value}>
            <div className="app-theme h-full w-full" style={paletteToCssVariables(activePalette)}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
