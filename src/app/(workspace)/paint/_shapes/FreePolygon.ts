import bresenham from "../_algorithms/BresenhamLine";
import dda from "../_algorithms/DDA";
import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";

export default class FreePolygon extends Shape {
    kind = 'polygon' as const;
    points: Point[];

    constructor(points: Point[], opts: ShapeOptions) {
        super(opts);
        this.points = points;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        if (this.points.length < 2) return;
        ctx.fillStyle = this.strokeStyle;
        const algorithm = this.lineAlgorithm === 'dda' ? dda : bresenham;
        const draw = this.drawPixel.bind(this);
        for (let i = 0; i < this.points.length; i++) {
            const next = (i + 1) % this.points.length;
            algorithm(this.points[i], this.points[next], draw, ctx);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        if (this.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        if (this.filled) {
            ctx.fillStyle = this.fillStyle;
            ctx.fill();
        }
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        const xs = this.points.map(p => p.x), ys = this.points.map(p => p.y);
        const x = Math.min(...xs), y = Math.min(...ys);
        return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }

    moveBy(dx: number, dy: number): void {
        this.translatePointCollection(this.points, dx, dy);
    }

    rotateBy(angle: number, pivot: Point): void {
        this.rotatePoints(this.points, this._rotateOriginalPoints, angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        return this.resizePointCollection(this.points, bounds, options);
    }
}
