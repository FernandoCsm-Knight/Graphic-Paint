import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";

export default class Ellipse extends Shape {
    kind = 'ellipse' as const;

    center: Point;
    radiusX: number;
    radiusY: number;
    /** Orientation angle of the ellipse axes in radians (baked into data). */
    ellipseAngle: number = 0;

    // Frozen at beginRotate() so rotation always maps from the original state.
    private _frozenCenter: Point | null = null;
    private _frozenAngle: number = 0;

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

        const cos = Math.cos(this.ellipseAngle);
        const sin = Math.sin(this.ellipseAngle);
        const hasAngle = this.ellipseAngle !== 0;

        let p;
        let x = 0;
        let y = this.radiusY;

        let px = 0;
        let py = tworx2 * y;

        const plotEllipsePoints = (cx: number, cy: number, ox: number, oy: number) => {
            const pairs: [number, number][] = [
                [ox,  oy], [-ox,  oy],
                [ox, -oy], [-ox, -oy],
            ];
            for (const [dx, dy] of pairs) {
                let rx = dx, ry = dy;
                if (hasAngle) {
                    rx = dx * cos - dy * sin;
                    ry = dx * sin + dy * cos;
                }
                this.drawPixel({ x: Math.round(cx + rx), y: Math.round(cy + ry) }, ctx);
            }
        };

        plotEllipsePoints(this.center.x, this.center.y, x, y);

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

            plotEllipsePoints(this.center.x, this.center.y, x, y);
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

            plotEllipsePoints(this.center.x, this.center.y, x, y);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.ellipse(this.center.x, this.center.y, this.radiusX, this.radiusY, this.ellipseAngle, 0, 2 * Math.PI);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        // Axis-aligned bounding box of a rotated ellipse.
        const cos = Math.cos(this.ellipseAngle);
        const sin = Math.sin(this.ellipseAngle);
        const w = Math.sqrt(this.radiusX * this.radiusX * cos * cos + this.radiusY * this.radiusY * sin * sin);
        const h = Math.sqrt(this.radiusX * this.radiusX * sin * sin + this.radiusY * this.radiusY * cos * cos);
        return { x: this.center.x - w, y: this.center.y - h, width: w * 2, height: h * 2 };
    }

    getCenter() { return { x: this.center.x, y: this.center.y }; }

    override getVisualRotation(): number { return this.ellipseAngle; }

    override getOverlayBounds(): BoundingBox {
        return {
            x: this.center.x - this.radiusX,
            y: this.center.y - this.radiusY,
            width: this.radiusX * 2,
            height: this.radiusY * 2,
        };
    }

    moveBy(dx: number, dy: number): void {
        this.center.x += dx;
        this.center.y += dy;
        this.moveTransformFrame(dx, dy);
    }

    override beginRotate(): void {
        this.beginRotateTransformFrame();
        this._frozenCenter = { ...this.center };
        this._frozenAngle = this.ellipseAngle;
    }

    override endRotate(): void {
        this._frozenCenter = null;
    }

    rotateBy(angle: number, pivot: Point): void {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const src = this._frozenCenter ?? this.center;
        this.center = this.rotateOnePoint(src, pivot, cos, sin);
        this.ellipseAngle = this._frozenAngle + angle;
        this.applyRotationToTransformFrame(angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        void options;
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };

        this.center = this.pixelated
            ? { x: Math.round(center.x), y: Math.round(center.y) }
            : center;
        this.radiusX = this.pixelated ? Math.round(bounds.width / 2) : bounds.width / 2;
        this.radiusY = this.pixelated ? Math.round(bounds.height / 2) : bounds.height / 2;
        this.ellipseAngle = this._resizeRotation;
        this.applyResizeToTransformFrame(bounds, this.ellipseAngle);
        return true;
    }
};
