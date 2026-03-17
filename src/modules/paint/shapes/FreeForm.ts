import bresenham from "../algorithms/BresenhamLine";
import dda from "../algorithms/DDA";
import type { Point } from "../../../functions/geometry";
import { SceneItem, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import type { BrushStyle, LineAlgorithm } from "../context/SettingsContext";

export default class FreeForm extends SceneItem {
    kind = 'freeform' as const;

    strokeStyle: string;
    lineWidth: number;
    pixelated: boolean;
    pixelSize: number;
    lineAlgorithm: LineAlgorithm;
    lineDash: number[];
    brushStyle: BrushStyle;
    isEraser: boolean;
    filled: boolean;

    points: Point[];
    private boundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
    private snapshot: ImageData | null = null;
    /** Canvas state captured before the stroke begins — used to redraw the full
     *  dashed path from scratch on each lineTo, keeping the dash phase consistent. */
    private preStrokeSnapshot: ImageData | null = null;

    constructor(points: Point[], opts: ShapeOptions & { isEraser: boolean; brushStyle?: BrushStyle }) {
        super();
        this.strokeStyle = opts.strokeStyle ?? '#000000';
        this.lineWidth = opts.lineWidth ?? 1;
        this.pixelated = opts.pixelated ?? false;
        this.pixelSize = opts.pixelSize ?? 20;
        this.lineAlgorithm = opts.lineAlgorithm ?? 'bresenham';
        this.lineDash = opts.lineDash ?? [];
        this.brushStyle = opts.brushStyle ?? 'smooth';
        this.isEraser = opts.isEraser;
        this.filled = opts.filled ?? false;
        this.points = points;
        this.updateBoundingBox();
    }

    /** Call once before the first lineTo when lineDash is active. */
    beginStroke(ctx: CanvasRenderingContext2D): void {
        this.preStrokeSnapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    override captureSnapshot(ctx: CanvasRenderingContext2D): void {
        this.snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        this.preStrokeSnapshot = null; // free memory — no longer needed
    }

    override isCheckpoint(): boolean { return this.snapshot !== null; }

    override requiresSnapshot(): boolean { return true; }

    override draw(ctx: CanvasRenderingContext2D): void {
        if (this.snapshot !== null) {
            ctx.putImageData(this.snapshot, 0, 0);
            return;
        }
        ctx.fillStyle = this.strokeStyle;
        if (this.pixelated) {
            this.pixelatedDraw(ctx);
        } else {
            this.standardDraw(ctx);
        }
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
        } else if(this.brushStyle === 'spray') {
            if(distance > 1) {
                const density = Math.max(8, this.lineWidth * 3);
                const radius = this.lineWidth * 2.5;
                ctx.fillStyle = this.strokeStyle;
                for(let i = 0; i < density; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.sqrt(Math.random()) * radius;
                    ctx.fillRect(p.x + r * Math.cos(angle) - 0.5, p.y + r * Math.sin(angle) - 0.5, 1, 1);
                }
                this.addPoint(p);
            }
        } else if(distance > 2) {
            this.addPoint(p);
            if(this.lineDash.length > 0 && this.preStrokeSnapshot) {
                // Restore the canvas to its pre-stroke state and redraw the full
                // path so the dash phase is computed from the start of the stroke.
                ctx.putImageData(this.preStrokeSnapshot, 0, 0);
                this.standardDraw(ctx);
            } else {
                const lineCap: CanvasLineCap = this.brushStyle === 'hard' ? 'butt' : 'round';
                const lineJoin: CanvasLineJoin = this.brushStyle === 'hard' ? 'miter' : 'round';
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(p.x, p.y);
                ctx.lineWidth = this.lineWidth;
                ctx.lineCap = lineCap;
                ctx.lineJoin = lineJoin;
                ctx.stroke();
                ctx.restore();
            }
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

        if(this.brushStyle === 'spray') {
            // Spray: draw a filled dot at each recorded point (simplified replay)
            ctx.fillStyle = this.strokeStyle;
            const r = this.lineWidth / 2;
            for(const pt of this.points) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if(this.points.length === 1) {
            ctx.beginPath();
            ctx.arc(this.points[0].x, this.points[0].y, this.lineWidth / 2, 0, 2 * Math.PI);
            ctx.fillStyle = this.strokeStyle;
            ctx.fill();
        } else {
            const lineCap: CanvasLineCap = this.brushStyle === 'hard' ? 'butt' : 'round';
            const lineJoin: CanvasLineJoin = this.brushStyle === 'hard' ? 'miter' : 'round';
            ctx.save();
            if(this.lineDash.length > 0) ctx.setLineDash(this.lineDash);
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for(let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = lineCap;
            ctx.lineJoin = lineJoin;
            ctx.stroke();
            ctx.restore();
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

    getBoundingBox(): BoundingBox {
        const bb = this.boundingBox;
        if (!bb) return { x: 0, y: 0, width: 0, height: 0 };
        return { x: bb.minX, y: bb.minY, width: bb.maxX - bb.minX, height: bb.maxY - bb.minY };
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

    private drawPixel(p: Point, ctx: CanvasRenderingContext2D): void {
        const halfWidth = Math.floor(this.lineWidth / 2);
        const start = (this.lineWidth % 2 === 0) ? -halfWidth + 1 : -halfWidth;
        const end = halfWidth;
        for(let dx = start; dx <= end; dx++) {
            for(let dy = start; dy <= end; dy++) {
                ctx.fillRect((p.x + dx) * this.pixelSize, (p.y + dy) * this.pixelSize, this.pixelSize, this.pixelSize);
            }
        }
    }
}
