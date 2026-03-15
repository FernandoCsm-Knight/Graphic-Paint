import type { Point } from "../functions/geometry";

export const STANDARD_GRID_SIZE = 32;
export const GRID_LINE_COLOR = "#d5d9e2";
export const GRID_LINE_CSS_VAR = "--workspace-grid-line";
export const THEME_SURFACE_CSS_VAR = "--ui-input-surface";
export const THEME_ACCENT_CSS_VAR = "--ui-menu-control-active-surface";

const themeColorCache = {
    root: null as Element | null,
    styleSignature: "",
    values: new Map<string, string>(),
};

export const resolveThemeCssVar = (cssVar: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;

    let themeRoot = themeColorCache.root;
    if (!(themeRoot instanceof Element) || !document.contains(themeRoot)) {
        themeRoot = document.querySelector(".app-theme") ?? document.documentElement;
        themeColorCache.root = themeRoot;
        themeColorCache.styleSignature = "";
        themeColorCache.values.clear();
    }

    const styleSignature = themeRoot.getAttribute("style") ?? "";
    if (styleSignature !== themeColorCache.styleSignature) {
        themeColorCache.styleSignature = styleSignature;
        themeColorCache.values.clear();
    }

    const cachedValue = themeColorCache.values.get(cssVar);
    if (cachedValue) return cachedValue;

    const resolvedColor = window.getComputedStyle(themeRoot).getPropertyValue(cssVar).trim() || fallback;
    themeColorCache.values.set(cssVar, resolvedColor);
    return resolvedColor;
};

export const getGridCellSize = (pixelated: boolean, pixelSize: number, zoom: number = 1) => {
    return (pixelated ? pixelSize : STANDARD_GRID_SIZE) * zoom;
};

export const drawGrid = (
    ctx: CanvasRenderingContext2D,
    viewOffset: Point,
    cellSize: number,
    width: number,
    height: number,
    dpr: number
) => {
    const startX = ((viewOffset.x % cellSize) + cellSize) % cellSize;
    const startY = ((viewOffset.y % cellSize) + cellSize) % cellSize;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = resolveThemeCssVar(GRID_LINE_CSS_VAR, GRID_LINE_COLOR);
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= width; x += cellSize) {
        const alignedX = Math.round(x) + 0.5;
        ctx.moveTo(alignedX, 0);
        ctx.lineTo(alignedX, height);
    }

    for (let y = startY; y <= height; y += cellSize) {
        const alignedY = Math.round(y) + 0.5;
        ctx.moveTo(0, alignedY);
        ctx.lineTo(width, alignedY);
    }

    ctx.stroke();
    ctx.restore();
};
