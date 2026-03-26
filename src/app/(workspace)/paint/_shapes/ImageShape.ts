import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import { toPixels } from "../_types/Graphics";
import type { Point } from "@/types/geometry";

/**
 * A placed image treated as a regular scene shape so it can participate in the
 * same pending placement flow as vector geometry.
 *
 * Unlike vector shapes, ImageShape cannot bake rotation into pixel data without
 * expensive raster operations. Instead it stores a local `rotation` angle and
 * applies a canvas transform in `draw()`. The image position (x, y) is still
 * updated by `rotateBy` so the image moves to the correct location in the scene.
 */
export default class ImageShape extends Shape {
    readonly kind = 'image' as const;
    readonly image: CanvasImageSource;
    x: number;
    y: number;
    width: number;
    height: number;
    /** Canvas-transform rotation angle — kept because raster images cannot
     *  have rotation baked into their pixel data. */
    rotation: number = 0;
    flipX: boolean = false;
    flipY: boolean = false;

    // Frozen at beginRotate() so every frame rotates from the original state.
    private _frozenCenter: Point | null = null;
    private _frozenRotation: number = 0;

    constructor(
        image: CanvasImageSource,
        x: number,
        y: number,
        width: number,
        height: number,
        opts: ShapeOptions = {},
    ) {
        super(opts);
        this.image = image;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    override draw(ctx: CanvasRenderingContext2D): void {
        if (this.rotation !== 0) {
            const center = this.getCenter();
            const c = this.pixelated ? toPixels(center, this.pixelSize) : center;
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
            ctx.translate(-c.x, -c.y);
            if (this.pixelated) {
                this.pixelatedDraw(ctx);
            } else {
                this.standardDraw(ctx);
            }
            ctx.restore();
        } else {
            if (this.pixelated) {
                this.pixelatedDraw(ctx);
            } else {
                this.standardDraw(ctx);
            }
        }
    }

    getBoundingBox(): BoundingBox {
        const corners = this.getRotatedCorners();
        const xs = corners.map((point) => point.x);
        const ys = corners.map((point) => point.y);
        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
        };
    }

    override getCenter(): Point {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
        };
    }

    override getVisualRotation(): number {
        return this.rotation;
    }

    override getOverlayBounds(): BoundingBox {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    moveBy(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    override beginRotate(): void {
        this._frozenCenter = this.getCenter();
        this._frozenRotation = this.rotation;
    }

    override endRotate(): void {
        this._frozenCenter = null;
    }

    rotateBy(angle: number, pivot: Point): void {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const srcCenter = this._frozenCenter ?? this.getCenter();
        const dx = srcCenter.x - pivot.x;
        const dy = srcCenter.y - pivot.y;
        const nextCenter = {
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos,
        };
        this.setPositionFromCenter(nextCenter);
        this.rotation = this._frozenRotation + angle;
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.width;
        this.height = bounds.height;
        this.flipX = Boolean(options.flipX);
        this.flipY = Boolean(options.flipY);
        return true;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        // Coordinates are in grid units; apply pixelSize and the inclusive +1
        // convention used throughout the pixelated coordinate system.
        const origin = toPixels({ x: this.x, y: this.y }, this.pixelSize);
        const size   = toPixels({ x: this.width + 1, y: this.height + 1 }, this.pixelSize);
        ctx.drawImage(this.image, origin.x, origin.y, size.x, size.y);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    private setPositionFromCenter(center: Point): void {
        const nextX = center.x - this.width / 2;
        const nextY = center.y - this.height / 2;
        this.x = this.pixelated ? Math.round(nextX) : nextX;
        this.y = this.pixelated ? Math.round(nextY) : nextY;
    }

    private getRotatedCorners(): Point[] {
        const center = this.getCenter();
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const corners: Point[] = [
            { x: this.x, y: this.y },
            { x: this.x + this.width, y: this.y },
            { x: this.x + this.width, y: this.y + this.height },
            { x: this.x, y: this.y + this.height },
        ];

        return corners.map((corner) => {
            const dx = corner.x - center.x;
            const dy = corner.y - center.y;
            return {
                x: center.x + dx * cos - dy * sin,
                y: center.y + dx * sin + dy * cos,
            };
        });
    }
}
