import bresenham from "../algorithms/BresenhamLine";
import dda from "../algorithms/DDA";
import type { Point } from "./Graphics";
import { Shape, type ShapeOptions } from "./ShapeTypes";

export default class FreeForm extends Shape {
    kind = 'freeform' as const;

    isEraser: boolean;
    points: Point[];
    private boundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

    constructor(points: Point[], opts: ShapeOptions & { isEraser: boolean }){
        super(opts);
        this.points = points;
        this.isEraser = opts.isEraser;
        this.updateBoundingBox();
    }

    private updateBoundingBox(): void {
        if(this.points.length === 0) {
            this.boundingBox = null;
        } else {
            const start = this.points[0];
    
            let minX = start.x, maxX = start.x;
            let minY = start.y, maxY = start.y;
    
            for(let i = 1; i < this.points.length; i++) {
                const point = this.points[i];
                if(point.x < minX) minX = point.x;
                if(point.x > maxX) maxX = point.x;
                if(point.y < minY) minY = point.y;
                if(point.y > maxY) maxY = point.y;
            }
    
            this.boundingBox = { minX, maxX, minY, maxY };
        }
    }

    lineTo(p: Point, ctx: CanvasRenderingContext2D): void {
        const lastPoint = this.points[this.points.length - 1];
        const distance = Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y);

        const gco = ctx.globalCompositeOperation;
        if(this.isEraser) ctx.globalCompositeOperation = 'destination-out';

        ctx.strokeStyle = this.strokeStyle;

        if(this.pixelated) {
            ctx.fillStyle = this.strokeStyle;
            if(!this.contains(p)) {
                if(this.points.length === 1) this.drawPixel(lastPoint, ctx);
                const algorithm = this.lineAlgorithm === 'dda' ? dda : bresenham;
                algorithm(lastPoint, p, this.drawPixel.bind(this), ctx);
                this.addPoint(p);
            }
        } else if(distance > 2) {
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(p.x, p.y);
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            this.addPoint(p);
        }

        ctx.globalCompositeOperation = gco;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        if(this.points.length === 0) return;

        const gco = ctx.globalCompositeOperation;
        if(this.isEraser) ctx.globalCompositeOperation = 'destination-out';
        const prev = ctx.fillStyle;
        ctx.fillStyle = this.strokeStyle;

        if(this.points.length === 1) {
            this.drawPixel(this.points[0], ctx);
        } else {
            for(let i = 0; i < this.points.length - 1; i++) {
                const algorithm = this.lineAlgorithm === 'dda' ? dda : bresenham;
                algorithm(this.points[i], this.points[i + 1], this.drawPixel.bind(this), ctx);
            }
        }

        ctx.fillStyle = prev;
        ctx.globalCompositeOperation = gco;
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        if(this.points.length === 0) return;

        const gco = ctx.globalCompositeOperation;
        if(this.isEraser) ctx.globalCompositeOperation = 'destination-out';

        if(this.points.length === 1) {
            ctx.beginPath();
            ctx.arc(this.points[0].x, this.points[0].y, this.lineWidth / 2, 0, 2 * Math.PI);
            ctx.fillStyle = this.strokeStyle;
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);

            for(let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        ctx.globalCompositeOperation = gco;
    }

    contains(p: Point): boolean {
        let response = this.points.length !== 0 && this.boundingBox !== null;

        if(response) {
            if(this.pixelated) {
                response = this.points.find(pt => pt.x === p.x && pt.y === p.y) !== undefined;
            } else {
                const margin = this.lineWidth / 2 + 2;
    
                response = p.x >= this.boundingBox!.minX - margin && p.x <= this.boundingBox!.maxX + margin &&
                           p.y >= this.boundingBox!.minY - margin && p.y <= this.boundingBox!.maxY + margin;
                
                if(response) {
                    response = Math.hypot(p.x - this.points[0].x, p.y - this.points[0].y) <= margin;
    
                    let prevPoint = this.points[0];
                    for(let i = 1; i < this.points.length && !response; i++) {
                        const currentPoint = this.points[i];
    
                        const det = (currentPoint.x - prevPoint.x) * (p.y - prevPoint.y) - (currentPoint.y - prevPoint.y) * (p.x - prevPoint.x);
                        const inRange = p.x >= Math.min(prevPoint.x, currentPoint.x) && p.x <= Math.max(prevPoint.x, currentPoint.x) &&
                                        p.y >= Math.min(prevPoint.y, currentPoint.y) && p.y <= Math.max(prevPoint.y, currentPoint.y);
                        response = inRange && Math.abs(det) < 1;
    
                        prevPoint = currentPoint;
                    }
                }
            }
        }
        
        return response;
    }
    
    moveBy(dx: number, dy: number): void {
        for(let i = 0; i < this.points.length; i++) {
            this.points[i].x += dx;
            this.points[i].y += dy;
        }
        
        this.updateBoundingBox();
    }

    addPoint(point: Point): void {
        this.points.push(point);
        
        if(this.boundingBox) {
            if(point.x < this.boundingBox.minX) this.boundingBox.minX = point.x;
            if(point.x > this.boundingBox.maxX) this.boundingBox.maxX = point.x;
            if(point.y < this.boundingBox.minY) this.boundingBox.minY = point.y;
            if(point.y > this.boundingBox.maxY) this.boundingBox.maxY = point.y;
        }
    }
}