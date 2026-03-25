import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import { toPixels } from "../_types/Graphics";

/**
 * A placed image treated as a regular scene shape so it can participate in the
 * same pending placement flow as vector geometry.
 */
export default class ImageShape extends Shape {
    readonly kind = 'image' as const;
    readonly image: CanvasImageSource;
    x: number;
    y: number;
    width: number;
    height: number;

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

    resizeToBoundingBox(bounds: BoundingBox): boolean {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.width;
        this.height = bounds.height;
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
