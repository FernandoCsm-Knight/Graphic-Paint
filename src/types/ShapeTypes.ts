
export type Point = { x: number; y: number };

export const lineInfo = (start: Point, end: Point): { angle: number; size: number } => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = Math.hypot(end.x - start.x, end.y - start.y);
    return { angle, size };
};

export type Geometric = 'circle' | 
                    'square' | 
                    'triangle' | 
                    'diamond' | 
                    'pentagon' | 
                    'hexagon' | 
                    'octagon' | 
                    'star' | 
                    'rect' | 
                    'line' | 
                    'arrow' | 
                    'board' |
                    'image' |
                    'freeform';

export type ShapeOptions = {
    strokeStyle?: string;
    fillStyle?: string;
    lineWidth?: number;
    pixelated?: boolean;
    pixelSize?: number;
};

export abstract class Shape {
    abstract kind: Geometric;

    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    pixelated: boolean;
    pixelSize: number;

    constructor(opts: ShapeOptions) {
        this.strokeStyle = opts.strokeStyle ?? '#000000';
        this.fillStyle = opts.fillStyle ?? '#FFFFFF';
        this.lineWidth = opts.lineWidth ?? 1;
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
        ctx.rect(p.x * this.pixelSize, p.y * this.pixelSize, this.pixelSize, this.pixelSize);
        ctx.stroke();
        
        ctx.strokeStyle = originalStrokeStyle;
        ctx.globalCompositeOperation = gco;
        ctx.lineWidth = originalLineWidth;
    }
};


