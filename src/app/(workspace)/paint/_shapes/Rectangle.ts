import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import { rasterizePixelatedPolygon } from "../_algorithms/PolygonRasterization";

export default class Rectangle extends Shape {
    kind = 'rect' as const;

    points: Point[];

    constructor(topLeft: Point, bottomRight: Point, opts: ShapeOptions) {
        super(opts);
        // Store the 4 corners in order: TL, TR, BR, BL
        this.points = [
            { ...topLeft },
            { x: bottomRight.x, y: topLeft.y },
            { ...bottomRight },
            { x: topLeft.x, y: bottomRight.y },
        ];
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.strokeStyle;
        rasterizePixelatedPolygon(this.points, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        const xs = this.points.map(p => p.x), ys = this.points.map(p => p.y);
        const x = Math.min(...xs), y = Math.min(...ys);
        return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }

    moveBy(dx: number, dy: number): void {
        for (const p of this.points) {
            p.x += dx;
            p.y += dy;
        }
    }

    rotateBy(angle: number, pivot: Point): void {
        this.rotatePoints(this.points, this._rotateOriginalPoints, angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        return this.resizePointCollection(this.points, bounds, options);
    }
};
