import bresenham from "../algorithms/BresenhamLine";
import type { Point } from "../types/Graphics";
import { Shape, type ShapeOptions } from "../types/ShapeTypes";

export default class Line extends Shape {
    kind = 'line' as const;

    start: Point;
    end: Point;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        this.start = start;
        this.end = end;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
    bresenham(this.start, this.end, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point) {
        const det = (this.end.x - this.start.x) * (p.y - this.start.y) - (this.end.y - this.start.y) * (p.x - this.start.x);
        const inRange = p.x >= Math.min(this.start.x, this.end.x) && p.x <= Math.max(this.start.x, this.end.x) &&
                        p.y >= Math.min(this.start.y, this.end.y) && p.y <= Math.max(this.start.y, this.end.y);
        return inRange && Math.abs(det) < 1;
    }

    moveBy(dx: number, dy: number): void {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x += dx;
        this.end.y += dy;
    }
};
