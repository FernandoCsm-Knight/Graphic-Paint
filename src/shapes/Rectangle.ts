import { Shape, type Point, type ShapeOptions } from "../types/ShapeTypes";

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

    contains(p: Point): boolean {
        return p.x >= this.topLeft.x && p.x <= this.bottomRight.x && p.y >= this.topLeft.y && p.y <= this.bottomRight.y;
    }

    moveBy(dx: number, dy: number): void {
        this.topLeft.x += dx;
        this.topLeft.y += dy;
        this.bottomRight.x += dx;
        this.bottomRight.y += dy;
    }
};