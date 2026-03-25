import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";

export default class Rectangle extends Shape {
    kind = 'rect' as const;

    topLeft: Point;
    bottomRight: Point;

    constructor(topLeft: Point, bottomRight: Point, opts: ShapeOptions) {
        super(opts);
        this.topLeft = topLeft;
        this.bottomRight = bottomRight;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.strokeStyle;
        const dx = this.bottomRight.x - this.topLeft.x;
        const dy = this.bottomRight.y - this.topLeft.y;

        let x = this.topLeft.x;
        let y = this.topLeft.y;
        this.drawPixel({ x, y }, ctx);

        const incrX = dx > 0 ? 1 : -1;
        const incrY = dy > 0 ? 1 : -1;

        for(let i = 0; i < Math.abs(dx); i++) {
            x += incrX;
            this.drawPixel({ x: x, y: y }, ctx);
            this.drawPixel({ x: x, y: y + dy }, ctx);
        }

        for(let i = 0; i < Math.abs(dy); i++) {
            y += incrY;
            this.drawPixel({ x: x, y: y }, ctx);
            this.drawPixel({ x: x - dx, y: y }, ctx);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.rect(this.topLeft.x, this.topLeft.y, this.bottomRight.x - this.topLeft.x, this.bottomRight.y - this.topLeft.y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        const x = Math.min(this.topLeft.x, this.bottomRight.x);
        const y = Math.min(this.topLeft.y, this.bottomRight.y);
        return { x, y, width: Math.abs(this.bottomRight.x - this.topLeft.x), height: Math.abs(this.bottomRight.y - this.topLeft.y) };
    }

    moveBy(dx: number, dy: number): void {
        this.topLeft.x += dx;
        this.topLeft.y += dy;
        this.bottomRight.x += dx;
        this.bottomRight.y += dy;
    }

    resizeToBoundingBox(bounds: BoundingBox): boolean {
        this.topLeft = { x: bounds.x, y: bounds.y };
        this.bottomRight = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
        return true;
    }
};
