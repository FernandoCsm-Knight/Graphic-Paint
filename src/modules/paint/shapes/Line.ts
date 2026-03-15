import bresenham from "../algorithms/BresenhamLine";
import dda from "../algorithms/DDA";
import type { Point } from "../../../functions/geometry";
import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";

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
        ctx.fillStyle = this.strokeStyle;
        
        const algorithm = this.lineAlgorithm === 'dda' ? dda : bresenham;
        algorithm(this.start, this.end, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        const x = Math.min(this.start.x, this.end.x);
        const y = Math.min(this.start.y, this.end.y);
        return { x, y, width: Math.abs(this.end.x - this.start.x), height: Math.abs(this.end.y - this.start.y) };
    }

    moveBy(dx: number, dy: number): void {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x += dx;
        this.end.y += dy;
    }

    resizeToBoundingBox(bounds: BoundingBox): boolean {
        const currentBounds = this.getBoundingBox();
        this.start = this.mapPointToBoundingBox(this.start, currentBounds, bounds);
        this.end = this.mapPointToBoundingBox(this.end, currentBounds, bounds);
        return true;
    }
};
