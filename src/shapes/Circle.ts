import { Shape, type Point, type ShapeOptions } from "../types/ShapeTypes";

export default class Circle extends Shape {
    kind = 'circle' as const;

    center: Point;
    radius: number;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);

        const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2;

        this.center = center;
        this.radius = radius;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        let x = 0;
        let y = Math.round(this.radius);
        let p = 1 - Math.round(this.radius);

        const plotCirclePoints = (center_x: number, center_y: number, x: number, y: number) => {
            const cx = Math.round(center_x);
            const cy = Math.round(center_y);
            
            this.drawPixel({ x: cx + x, y: cy + y }, ctx);
            this.drawPixel({ x: cx - x, y: cy + y }, ctx);
            this.drawPixel({ x: cx + x, y: cy - y }, ctx);
            this.drawPixel({ x: cx - x, y: cy - y }, ctx);
            this.drawPixel({ x: cx + y, y: cy + x }, ctx);
            this.drawPixel({ x: cx - y, y: cy + x }, ctx);
            this.drawPixel({ x: cx + y, y: cy - x }, ctx);
            this.drawPixel({ x: cx - y, y: cy - x }, ctx);
        }

        plotCirclePoints(this.center.x, this.center.y, x, y);

        while(x < y) {
            x++;
            if(p < 0) {
                p += 2 * x + 1;
            } else {
                y--;
                p += 2 * x - 2 * y + 1;
            }

            plotCirclePoints(this.center.x, this.center.y, x, y);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        const dx = p.x - this.center.x;
        const dy = p.y - this.center.y;
        return dx * dx + dy * dy < this.radius * this.radius;
    }

    moveBy(dx: number, dy: number): void {
        this.center.x += dx;
        this.center.y += dy;
    }
};
