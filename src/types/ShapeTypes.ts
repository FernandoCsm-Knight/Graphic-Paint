import type { Geometric, Point } from "./Graphics";
import type { LineAlgorithm } from "../context/SettingsContext";

export type ShapeOptions = {
    strokeStyle?: string;
    fillStyle?: string;
    lineWidth?: number;
    filled?: boolean;
    pixelated?: boolean;
    pixelSize?: number;
    lineAlgorithm?: LineAlgorithm;
};

export abstract class Shape {
    abstract kind: Geometric;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    filled: boolean;
    pixelated: boolean;
    pixelSize: number;
    lineAlgorithm: LineAlgorithm;

    constructor(opts: ShapeOptions) {
        this.strokeStyle = opts.strokeStyle ?? '#000000';
        this.fillStyle = opts.fillStyle ?? '#FFFFFF';
        this.lineWidth = opts.lineWidth ?? 1;
        this.filled = opts.filled ?? false;
        this.pixelated = opts.pixelated ?? false;
        this.pixelSize = opts.pixelSize ?? 20;
        this.lineAlgorithm = opts.lineAlgorithm ?? 'bresenham';
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if(this.pixelated) {
            ctx.fillStyle = this.strokeStyle;
            this.pixelatedDraw(ctx);
        }
        else this.standardDraw(ctx);
    }

    abstract contains(p: Point): boolean;
    abstract moveBy(dx: number, dy: number): void;

    abstract pixelatedDraw(ctx: CanvasRenderingContext2D): void;
    abstract standardDraw(ctx: CanvasRenderingContext2D): void;

    drawPixel(p: Point, ctx: CanvasRenderingContext2D) {
        const halfWidth = Math.floor(this.lineWidth / 2);
        const start = (this.lineWidth % 2 === 0) ? -halfWidth + 1 : -halfWidth;
        const end = halfWidth;

        for(let dx = start; dx <= end; dx++) {
            for(let dy = start; dy <= end; dy++) {
                const pixelX = (p.x + dx) * this.pixelSize;
                const pixelY = (p.y + dy) * this.pixelSize;
                ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
            }
        }
    }
};


