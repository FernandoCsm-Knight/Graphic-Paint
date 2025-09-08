import { Shape, type Point, type ShapeOptions } from "../types/ShapeTypes";
import { rasterizePixelatedPolygon, rasterizePolygon } from "../algorithms/PolygonRasterization";

export default class Star extends Shape {
    kind = 'star' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const outerRadius = Math.hypot(end.x - start.x, end.y - start.y);
        const innerRadius = outerRadius / 2;

        this.points = [];
        for(let i = 0; i < 5; i++) {
            const outerAngle = angle + (i * 2 * Math.PI) / 5;
            const innerAngle = angle + (i * 2 * Math.PI) / 5 + Math.PI / 5;
            
            this.points.push({
                x: Math.round(start.x + outerRadius * Math.cos(outerAngle)),
                y: Math.round(start.y + outerRadius * Math.sin(outerAngle))
            });

            this.points.push({
                x: Math.round(start.x + innerRadius * Math.cos(innerAngle)),
                y: Math.round(start.y + innerRadius * Math.sin(innerAngle))
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
        const max = Math.max(...this.points.map(p => p.y));
        const min = Math.min(...this.points.map(p => p.y));
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= min && p.y <= max;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
};