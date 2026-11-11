import type { Point } from '@/types/geometry';

/**
 * Initial position for a floating panel opened from a toolbar button,
 * just below the toolbar and aligned with the button.
 *
 * The panel (GlassCard) is rendered next to the toolbar, so it is positioned
 * relative to the TOOLBAR's offset parent — not the button's (which is inside
 * the toolbar). Measuring against the wrong frame placed the panel under the
 * toolbar, hiding its first row.
 */
export function getPanelPositionBelow(button: HTMLElement | null, gap = 10): Point {
    if (!button) return { x: 0, y: 60 };
    const toolbar = button.closest<HTMLElement>('[data-paint-menu]');
    const frame = (toolbar?.offsetParent ?? button.offsetParent ?? document.documentElement) as HTMLElement;
    const frameRect = frame.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const toolbarBottom = toolbar ? toolbar.getBoundingClientRect().bottom : buttonRect.bottom;
    return {
        x: buttonRect.left - frameRect.left,
        y: Math.max(buttonRect.bottom, toolbarBottom) - frameRect.top + gap,
    };
}
