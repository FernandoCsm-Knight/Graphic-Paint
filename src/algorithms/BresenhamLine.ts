import type { Point } from "../types/Graphics";

const bresenham = (
    start: Point, 
    end: Point, 
    callback: (point: Point, ctx: CanvasRenderingContext2D) => void,
    ctx: CanvasRenderingContext2D
): void => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    const xIncrement = (end.x < start.x) ? -1 : 1;
    const yIncrement = (end.y < start.y) ? -1 : 1;

    let x = start.x;
    let y = start.y;

    callback({ x, y }, ctx);

    if(dy < dx) {
        let p = 2 * dy - dx;
        const twoDy = 2 * dy;
        const twoDyMinusDx = 2 * (dy - dx);
        
        for(let i = 0; i < dx; i++) {
            x += xIncrement;
            if(p < 0) {
                p += twoDy;
            } else {
                y += yIncrement;
                p += twoDyMinusDx;
            }

            callback({ x, y }, ctx);
        }
    } else {
        let p = 2 * dx - dy;
        const twoDx = 2 * dx;
        const twoDxMinusDy = 2 * (dx - dy);

        for(let i = 0; i < dy; i++) {
            y += yIncrement;
            if(p < 0) {
                p += twoDx;
            } else {
                x += xIncrement;
                p += twoDxMinusDy;
            }

            callback({ x, y }, ctx);
        }
    }
};

export default bresenham;
