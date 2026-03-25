import type { Point } from "@/types/geometry";

export type ClipWindow = { xMin: number; yMin: number; xMax: number; yMax: number };

const INSIDE = 0;
const LEFT   = 1;
const RIGHT  = 2;
const BOTTOM = 4;
const TOP    = 8;

/**
 * Calcula o outcode de um ponto em relação à janela de clipping.
 * Cada bit do resultado indica em qual região fora da janela o ponto se encontra
 * (LEFT, RIGHT, TOP, BOTTOM). Resultado 0 (INSIDE) indica que o ponto está dentro.
 */
function outcode(p: Point, w: ClipWindow): number {
    let code = INSIDE;
    if      (p.x < w.xMin) code |= LEFT;
    else if (p.x > w.xMax) code |= RIGHT;
    if      (p.y < w.yMin) code |= TOP;
    else if (p.y > w.yMax) code |= BOTTOM;
    return code;
}

/**
 * Cohen-Sutherland line clipping.
 * Returns the portion of the segment [p1, p2] that lies inside `win`,
 * or null if the segment is completely outside.
 */
export const cohenSutherland = (
    p1: Point,
    p2: Point,
    win: ClipWindow,
): { p1: Point; p2: Point } | null => {
    let x0 = p1.x, y0 = p1.y;
    let x1 = p2.x, y1 = p2.y;
    let code0 = outcode({ x: x0, y: y0 }, win);
    let code1 = outcode({ x: x1, y: y1 }, win);

    for (;;) {
        if (!(code0 | code1)) {
            return { p1: { x: x0, y: y0 }, p2: { x: x1, y: y1 } };
        }
        if (code0 & code1) {
            return null;
        }

        const codeOut = code0 !== 0 ? code0 : code1;
        let x = 0, y = 0;

        if (codeOut & BOTTOM) {
            x = x0 + (x1 - x0) * (win.yMax - y0) / (y1 - y0);
            y = win.yMax;
        } else if (codeOut & TOP) {
            x = x0 + (x1 - x0) * (win.yMin - y0) / (y1 - y0);
            y = win.yMin;
        } else if (codeOut & RIGHT) {
            y = y0 + (y1 - y0) * (win.xMax - x0) / (x1 - x0);
            x = win.xMax;
        } else {
            y = y0 + (y1 - y0) * (win.xMin - x0) / (x1 - x0);
            x = win.xMin;
        }

        if (codeOut === code0) {
            x0 = x; y0 = y;
            code0 = outcode({ x: x0, y: y0 }, win);
        } else {
            x1 = x; y1 = y;
            code1 = outcode({ x: x1, y: y1 }, win);
        }
    }
};
