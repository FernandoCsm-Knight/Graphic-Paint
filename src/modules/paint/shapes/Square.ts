import type { Point } from "../../../functions/geometry";
import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";

export default class Square extends Shape {
    kind = 'square' as const;

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
        const side = Math.max(Math.abs(dx), Math.abs(dy));

        let x = this.topLeft.x;
        let y = this.topLeft.y;
        this.drawPixel({ x, y }, ctx);

        const incrX = dx > 0 ? 1 : -1;
        const incrY = dy > 0 ? 1 : -1;

        for(let i = 0; i < side; i++) {
            x += incrX;
            this.drawPixel({ x: x, y }, ctx);
            this.drawPixel({ x: x, y: y + (incrY > 0 ? side : -side) }, ctx);
        }

        for(let i = 0; i < side; i++) {
            y += incrY;
            this.drawPixel({ x, y: y }, ctx);
            this.drawPixel({ x: x - (incrX > 0 ? side : -side), y: y }, ctx);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const dx = this.bottomRight.x - this.topLeft.x;
        const dy = this.bottomRight.y - this.topLeft.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));

        ctx.beginPath();

        if(dx > 0 && dy > 0) {
            ctx.rect(this.topLeft.x, this.topLeft.y, side, side);
        } else if(dx > 0 && dy < 0) {
            ctx.rect(this.topLeft.x, this.topLeft.y,  side, -side);
        } else if(dx < 0 && dy > 0) {
            ctx.rect(this.topLeft.x, this.topLeft.y,  -side, side);
        } else {
            ctx.rect(this.topLeft.x, this.topLeft.y,  -side, -side);
        }

        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        const dx = this.bottomRight.x - this.topLeft.x;
        const dy = this.bottomRight.y - this.topLeft.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        const x = dx >= 0 ? this.topLeft.x : this.topLeft.x - side;
        const y = dy >= 0 ? this.topLeft.y : this.topLeft.y - side;
        return { x, y, width: side, height: side };
    }

    moveBy(dx: number, dy: number): void {
        this.topLeft.x += dx;
        this.topLeft.y += dy;
        this.bottomRight.x += dx;
        this.bottomRight.y += dy;
    }
};