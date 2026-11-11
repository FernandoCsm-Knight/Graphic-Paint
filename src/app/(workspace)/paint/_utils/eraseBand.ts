/** Vertical band of the document cleared by the page-size eraser. */
export type EraseBand = { top: number; bottom: number };

/** Union of two contiguous/overlapping bands (null = nothing erased yet). */
export function mergeEraseBands(current: EraseBand | null, next: EraseBand): EraseBand {
    if (!current) return { ...next };
    return {
        top: Math.min(current.top, next.top),
        bottom: Math.max(current.bottom, next.bottom),
    };
}

/**
 * Rectangle to record in the scene for the erased band, spanning the full
 * document width. Returns null when the band is empty.
 */
export function eraseBandToRect(
    band: EraseBand | null,
    documentWidth: number,
): { x: number; y: number; w: number; h: number } | null {
    if (!band) return null;
    const h = band.bottom - band.top;
    if (h <= 0 || documentWidth <= 0) return null;
    return { x: 0, y: band.top, w: documentWidth, h };
}
