import { lineInfo, Shape, type Point, type ShapeOptions } from "../types/ShapeTypes";
import { rasterizePixelatedPolygon, rasterizePolygon } from "../algorithms/PolygonRasterization";

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
        rasterizePixelatedPolygon(this.points, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        rasterizePolygon(this.points, this.lineWidth, this.strokeStyle, ctx);
    }

    contains(p: Point): boolean {
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= this.points[0].y && p.y <= this.points[2].y;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
};