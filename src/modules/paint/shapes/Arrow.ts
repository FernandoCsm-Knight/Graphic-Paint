import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import bresenham from "../algorithms/BresenhamLine";
import type { Point } from "../../../functions/geometry";

export default class Arrow extends Shape {
    kind = 'arrow' as const;

    start: Point;
    end: Point;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        this.start = start;
        this.end = end;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.strokeStyle;
        const angle = Math.atan2(this.end.y - this.start.y, this.end.x - this.start.x);
        const headLength = Math.max(3, 2 * this.lineWidth);

        bresenham(this.start, this.end, this.drawPixel.bind(this), ctx);

        const arrowHead1: Point = {
            x: Math.round(this.end.x - headLength * Math.cos(angle - Math.PI / 6)),
            y: Math.round(this.end.y - headLength * Math.sin(angle - Math.PI / 6))
        };

        const arrowHead2: Point = {
            x: Math.round(this.end.x - headLength * Math.cos(angle + Math.PI / 6)),
            y: Math.round(this.end.y - headLength * Math.sin(angle + Math.PI / 6))
        };

        bresenham(this.end, arrowHead1, this.drawPixel.bind(this), ctx);
        bresenham(this.end, arrowHead2, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const angle = Math.atan2(this.end.y - this.start.y, this.end.x - this.start.x);
        const headLength = Math.max(3, 2 * this.lineWidth);

        const x = this.end.x;
        const y = this.end.y;

        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);

        ctx.lineTo(x, y);
        ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
        
        ctx.moveTo(x, y);
        ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));

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
