import type { Point } from "@/types/geometry";
import type { ClipWindow } from "./CohenSutherland";

/**
 * Liang-Barsky parametric line clipping.
 * Returns the portion of the segment [p1, p2] that lies inside `win`,
 * or null if the segment is completely outside.
 */
export const liangBarsky = (
    p1: Point,
    p2: Point,
    win: ClipWindow,
): { p1: Point; p2: Point } | null => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // p[i]*t <= q[i] for each boundary
    const p = [-dx, dx, -dy, dy];
    const q = [
        p1.x - win.xMin,
        win.xMax - p1.x,
        p1.y - win.yMin,
        win.yMax - p1.y,
    ];

    let t0 = 0;
    let t1 = 1;

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            // Segment is parallel to this boundary
            if (q[i] < 0) return null;
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                // Entering boundary
                t0 = Math.max(t0, t);
            } else {
                // Exiting boundary
                t1 = Math.min(t1, t);
            }
        }
    }

    if (t0 > t1) return null;

    return {
        p1: { x: p1.x + t0 * dx, y: p1.y + t0 * dy },
        p2: { x: p1.x + t1 * dx, y: p1.y + t1 * dy },
    };
};
