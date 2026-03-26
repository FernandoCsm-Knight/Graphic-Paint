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
    private _frozenX: number = 0;
    private _frozenY: number = 0;
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
            const bb = this.getBoundingBox();
            const cx = bb.x + bb.width  / 2;
            const cy = bb.y + bb.height / 2;
            const c = this.pixelated ? toPixels({ x: cx, y: cy }, this.pixelSize) : { x: cx, y: cy };
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
        this._frozenX = this.x;
        this._frozenY = this.y;
        this._frozenRotation = this.rotation;
    }

    override endRotate(): void {
        // Nothing extra to clear (scalar fields, not arrays).
    }

    rotateBy(angle: number, pivot: Point): void {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        // Rotate the image's top-left corner around the pivot.
        const dx = this._frozenX - pivot.x, dy = this._frozenY - pivot.y;
        this.x = pivot.x + dx * cos - dy * sin;
        this.y = pivot.y + dx * sin + dy * cos;
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
}
