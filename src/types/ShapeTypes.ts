import type { Geometric, Point } from "./Graphics";

export type ShapeOptions = {
    strokeStyle?: string;
    fillStyle?: string;
    lineWidth?: number;
    filled?: boolean;
    pixelated?: boolean;
    pixelSize?: number;
};

export abstract class Shape {
    abstract kind: Geometric;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    filled: boolean;
    pixelated: boolean;
    pixelSize: number;

    constructor(opts: ShapeOptions) {
        this.strokeStyle = opts.strokeStyle ?? '#000000';
        this.fillStyle = opts.fillStyle ?? '#FFFFFF';
        this.lineWidth = opts.lineWidth ?? 1;
        this.filled = opts.filled ?? false;
        this.pixelated = opts.pixelated ?? false;
        this.pixelSize = opts.pixelSize ?? 20;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if(this.pixelated) this.pixelatedDraw(ctx);
        else this.standardDraw(ctx);
    }

    abstract contains(p: Point): boolean;
    abstract moveBy(dx: number, dy: number): void;

    abstract pixelatedDraw(ctx: CanvasRenderingContext2D): void;
    abstract standardDraw(ctx: CanvasRenderingContext2D): void;

    drawPixel(p: Point, ctx: CanvasRenderingContext2D): void {
        ctx.fillRect(p.x * this.pixelSize, p.y * this.pixelSize, this.pixelSize, this.pixelSize);
    }

    drawPixelGrid(p: Point, ctx: CanvasRenderingContext2D): void {
        const originalStrokeStyle = ctx.strokeStyle;
        const gco = ctx.globalCompositeOperation;
        const originalLineWidth = ctx.lineWidth;

        ctx.globalCompositeOperation = 'destination-over';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.clearRect(p.x * this.pixelSize, p.y * this.pixelSize, this.pixelSize, this.pixelSize);
        ctx.rect(p.x * this.pixelSize, p.y * this.pixelSize, this.pixelSize, this.pixelSize);
        ctx.stroke();
        
        ctx.strokeStyle = originalStrokeStyle;
        ctx.globalCompositeOperation = gco;
        ctx.lineWidth = originalLineWidth;
    }
};


