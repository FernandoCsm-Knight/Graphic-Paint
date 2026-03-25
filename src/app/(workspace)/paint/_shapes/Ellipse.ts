import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";

export default class Ellipse extends Shape {
    kind = 'ellipse' as const;

    center: Point;
    radiusX: number;
    radiusY: number;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);

        const center = { x: Math.round((start.x + end.x) / 2), y: Math.round((start.y + end.y) / 2) };
        const radiusX = Math.round(Math.abs(end.x - start.x) / 2);
        const radiusY = Math.round(Math.abs(end.y - start.y) / 2);

        this.center = center;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const rx2 = this.radiusX * this.radiusX;
        const ry2 = this.radiusY * this.radiusY;
        const tworx2 = 2 * rx2;
        const twory2 = 2 * ry2;

        let p;
        let x = 0;
        let y = this.radiusY;

        let px = 0;
        let py = tworx2 * y;

        const plotEllipsePoints = (center: Point, point: Point) => {
            this.drawPixel({ x: center.x + point.x, y: center.y + point.y }, ctx);
            this.drawPixel({ x: center.x - point.x, y: center.y + point.y }, ctx);
            this.drawPixel({ x: center.x + point.x, y: center.y - point.y }, ctx);
            this.drawPixel({ x: center.x - point.x, y: center.y - point.y }, ctx);
        }

        plotEllipsePoints(this.center, { x: x, y: y });

        p = Math.round(ry2 - (rx2 * this.radiusY) + (0.25 * rx2));
        while(px < py) {
            x++;
            px += twory2;
            if(p < 0) p += ry2 + px;
            else {
                y--;
                py -= tworx2;
                p += ry2 + px - py;
            }

            plotEllipsePoints(this.center, { x: x, y: y });
        }

        p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
        while(y > 0) {
            y--;
            py -= tworx2;
            if(p > 0) p += rx2 - py;
            else {
                x++;
                px += twory2;
                p += rx2 - py + px;
            }

            plotEllipsePoints(this.center, { x: x, y: y });
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.ellipse(this.center.x, this.center.y, this.radiusX, this.radiusY, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        return { x: this.center.x - this.radiusX, y: this.center.y - this.radiusY, width: this.radiusX * 2, height: this.radiusY * 2 };
    }

    getCenter() { return { x: this.center.x, y: this.center.y }; }

    moveBy(dx: number, dy: number): void {
        this.center.x += dx;
        this.center.y += dy;
    }

    resizeToBoundingBox(bounds: BoundingBox): boolean {
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };

        this.center = this.pixelated
            ? { x: Math.round(center.x), y: Math.round(center.y) }
            : center;
        this.radiusX = this.pixelated ? Math.round(bounds.width / 2) : bounds.width / 2;
        this.radiusY = this.pixelated ? Math.round(bounds.height / 2) : bounds.height / 2;
        return true;
    }
};
