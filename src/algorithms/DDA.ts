import type { Point } from "../types/Graphics";

const dda = (
    start: Point, 
    end: Point, 
    callback: (point: Point, ctx: CanvasRenderingContext2D) => void, 
    ctx: CanvasRenderingContext2D
): void => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    const xIncrement = dx / steps;
    const yIncrement = dy / steps;

    let x = start.x;
    let y = start.y;

    callback({ x, y }, ctx);
    for(let i = 0; i < steps; i++) {
        x += xIncrement;
        y += yIncrement;
        callback({ x: Math.round(x), y: Math.round(y) }, ctx);
    }
};

export default dda;