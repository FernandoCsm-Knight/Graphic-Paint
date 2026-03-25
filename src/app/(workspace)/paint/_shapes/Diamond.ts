import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import { rasterizePixelatedPolygon, rasterizePolygon } from "../_algorithms/PolygonRasterization";
import { createPolygon } from "../_types/Graphics";
import type { Point } from "@/types/geometry";

export default class Diamond extends Shape {
    kind = 'diamond' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        this.points = createPolygon(4, start, end);
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.strokeStyle;
        rasterizePixelatedPolygon(this.points, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        rasterizePolygon(this.points, this.lineWidth, this.strokeStyle, ctx);
    }

    getBoundingBox(): BoundingBox {
        const xs = this.points.map(p => p.x), ys = this.points.map(p => p.y);
        const x = Math.min(...xs), y = Math.min(...ys);
        return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }

    resizeToBoundingBox(bounds: BoundingBox): boolean {
        return this.resizePointCollection(this.points, bounds);
    }
};
