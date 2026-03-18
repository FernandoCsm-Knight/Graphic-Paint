/**
 * Encapsulates the overlay redraw logic for the current selection state.
 *
 * Stored in PaintContext as selectionItemRef so that renderViewport() can
 * restore the selection UI (dashed rect or floating image) after clearing the
 * overlay on resize, pan, or zoom — mirroring the redrawPendingOverlay pattern
 * used for pending shapes.
 *
 * useSelection.ts owns this object's lifetime: it calls update() whenever the
 * selection state changes, and update(null) when the selection is idle.
 */
export class SelectionOverlayItem {
    private redrawFn: (() => void) | null = null;

    /** Replace the stored redraw function. Pass null to disable redrawing. */
    update(fn: (() => void) | null): void {
        this.redrawFn = fn;
    }

    /** Called by renderViewport() after the overlay is cleared. */
    redrawOverlay(): void {
        this.redrawFn?.();
    }
}
