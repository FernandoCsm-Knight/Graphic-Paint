import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";

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
        ctx.fillStyle = this.strokeStyle;
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

    getBoundingBox(): BoundingBox {
        return { x: this.center.x - this.radius, y: this.center.y - this.radius, width: this.radius * 2, height: this.radius * 2 };
    }

    getCenter() { return { x: this.center.x, y: this.center.y }; }

    moveBy(dx: number, dy: number): void {
        this.center.x += dx;
        this.center.y += dy;
        this.moveTransformFrame(dx, dy);
    }

    override beginRotate(): void {
        this.beginRotateTransformFrame();
        this._rotateOriginalPoints = [{ ...this.center }];
    }

    rotateBy(angle: number, pivot: Point): void {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const src = this._rotateOriginalPoints?.[0] ?? this.center;
        this.center = this.rotateOnePoint(src, pivot, cos, sin);
        this.applyRotationToTransformFrame(angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        void options;
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
        const radius = Math.max(bounds.width, bounds.height) / 2;

        this.center = this.pixelated
            ? { x: Math.round(center.x), y: Math.round(center.y) }
            : center;
        this.radius = this.pixelated ? Math.round(radius) : radius;
        this.applyResizeToTransformFrame(bounds, 0);
        return true;
    }
};
