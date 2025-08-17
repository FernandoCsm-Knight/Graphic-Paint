import { Shape, type Point, type ShapeOptions } from "./ShapeTypes";

export default class Board extends Shape {
    kind = 'board' as const;

    width: number;
    height: number;
    xCount: number;
    yCount: number;

    constructor(width: number, height: number, opts: ShapeOptions) {
        super(opts);
        this.width = width;
        this.height = height;
        this.xCount = Math.floor(width / this.pixelSize);
        this.yCount = Math.floor(height / this.pixelSize);
    }

    map(p: Point): Point {
        return {
            x: Math.floor(p.x / this.pixelSize),
            y: Math.floor(p.y / this.pixelSize)
        }
    }

    isValidGridPosition(gridPos: Point): boolean {
        return gridPos.x >= 0 && gridPos.x < this.xCount && 
               gridPos.y >= 0 && gridPos.y < this.yCount;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if(!this.pixelated) return; 

        const gco = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;

        for(let i = 0; i <= this.xCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.pixelSize, 0);
            ctx.lineTo(i * this.pixelSize, this.height);
            ctx.stroke();
        }

        for(let i = 0; i <= this.yCount; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * this.pixelSize);
            ctx.lineTo(this.width, i * this.pixelSize);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = gco;
    }

    contains(p: Point): boolean {
        return p.x <= this.width && p.y <= this.height && p.x >= 0 && p.y >= 0;
    }

    moveBy(): void {}

    clear(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(0, 0, this.width, this.height);
    }
}