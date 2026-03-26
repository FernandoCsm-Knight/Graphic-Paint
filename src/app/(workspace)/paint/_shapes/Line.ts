import bresenham from "../_algorithms/BresenhamLine";
import dda from "../_algorithms/DDA";
import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";

export default class Line extends Shape {
    kind = 'line' as const;

    start: Point;
    end: Point;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        this.start = start;
        this.end = end;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.strokeStyle;
        
        const algorithm = this.lineAlgorithm === 'dda' ? dda : bresenham;
        algorithm(this.start, this.end, this.drawPixel.bind(this), ctx);
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    getBoundingBox(): BoundingBox {
        const x = Math.min(this.start.x, this.end.x);
        const y = Math.min(this.start.y, this.end.y);
        return { x, y, width: Math.abs(this.end.x - this.start.x), height: Math.abs(this.end.y - this.start.y) };
    }

    moveBy(dx: number, dy: number): void {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x += dx;
        this.end.y += dy;
        this.moveTransformFrame(dx, dy);
    }

    override beginRotate(): void {
        this.beginRotateTransformFrame();
        this._rotateOriginalPoints = [{ ...this.start }, { ...this.end }];
    }

    rotateBy(angle: number, pivot: Point): void {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const frozen = this._rotateOriginalPoints;
        const srcStart = frozen?.[0] ?? this.start;
        const srcEnd   = frozen?.[1] ?? this.end;
        this.start = this.rotateOnePoint(srcStart, pivot, cos, sin);
        this.end   = this.rotateOnePoint(srcEnd,   pivot, cos, sin);
        this.applyRotationToTransformFrame(angle, pivot);
    }

    override beginResize(
        bounds: BoundingBox = this.getBoundingBox(),
        rotation: number = 0,
        center: Point = this.getCenter(),
    ): void {
        this._resizeOriginalPoints = [{ ...this.start }, { ...this.end }];
        this._resizeOriginalBounds = bounds;
        this._resizeRotation = rotation;
        this._resizeCenter = { ...center };
        this.setTransformFrame(bounds, rotation);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        const srcStart  = this._resizeOriginalPoints?.[0] ?? this.start;
        const srcEnd    = this._resizeOriginalPoints?.[1] ?? this.end;
        const srcBounds = this._resizeOriginalBounds ?? this.getBoundingBox();
        this.start = this.mapPointToBoundingBox(srcStart, srcBounds, bounds, options);
        this.end   = this.mapPointToBoundingBox(srcEnd,   srcBounds, bounds, options);
        this.applyResizeToTransformFrame(bounds, this._resizeRotation);
        return true;
    }
};
