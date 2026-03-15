import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";

/**
 * A placed image treated as a regular scene shape so it can participate in the
 * same pending placement flow as vector geometry.
 */
export default class ImageShape extends Shape {
    readonly kind = 'image' as const;
    readonly image: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(
        image: HTMLImageElement,
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
        this.standardDraw(ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}
