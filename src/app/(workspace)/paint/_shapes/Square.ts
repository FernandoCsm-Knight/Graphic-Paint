import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import { rasterizePixelatedPolygon } from "../_algorithms/PolygonRasterization";

export default class Square extends Shape {
    kind = 'square' as const;

    points: Point[];

    constructor(topLeft: Point, bottomRight: Point, opts: ShapeOptions) {
        super(opts);
        // Enforce square aspect: take the larger dimension and align from topLeft.
        const dx = bottomRight.x - topLeft.x;
        const dy = bottomRight.y - topLeft.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        const br: Point = { x: topLeft.x + signX * side, y: topLeft.y + signY * side };
        // Store the 4 corners in order: TL, TR, BR, BL
        this.points = [
            { ...topLeft },
            { x: br.x, y: topLeft.y },
            { ...br },
            { x: topLeft.x, y: br.y },
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
        this.translatePointCollection(this.points, dx, dy);
    }

    rotateBy(angle: number, pivot: Point): void {
        this.rotatePoints(this.points, this._rotateOriginalPoints, angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        // Enforce square constraint: use the larger side.
        const side = Math.max(bounds.width, bounds.height);
        const squareBounds: BoundingBox = { x: bounds.x, y: bounds.y, width: side, height: side };
        return this.resizePointCollection(this.points, squareBounds, options);
    }
};
