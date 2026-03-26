import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import type { Point } from "@/types/geometry";
import { rasterizePixelatedPolygon, rasterizePolygon } from "../_algorithms/PolygonRasterization";
import { lineInfo } from "../_types/Graphics";

export default class Triangle extends Shape {
    kind = 'triangle' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        const { angle, size } = lineInfo(start, end);
        
        this.points = [];
        for(let i = 0; i < 3; i++) {
            const adjust = (i * 2 * Math.PI) / 3;
            this.points.push({
                x: Math.round(start.x + size * Math.cos(angle + adjust)),
                y: Math.round(start.y + size * Math.sin(angle + adjust))
            });
        }
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
        this.translatePointCollection(this.points, dx, dy);
    }

    rotateBy(angle: number, pivot: Point): void {
        this.rotatePoints(this.points, this._rotateOriginalPoints, angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        return this.resizePointCollection(this.points, bounds, options);
    }
};
