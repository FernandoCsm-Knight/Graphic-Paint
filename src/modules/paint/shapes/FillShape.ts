import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import { type Geometric } from "../types/Graphics";
import type { Point } from "../../../functions/geometry";
import FloodFill from "../algorithms/FloodFill";
import ScanLineFill from "../algorithms/ScanLineFill";
import type { FillAlgorithm } from "../context/SettingsContext";

export interface FillOptions extends ShapeOptions {
    algorithm?: FillAlgorithm;
    isEraser?: boolean;
    point: Point;
}

export default class FillShape extends Shape {
    kind: Geometric = "floodfill";
    point: Point;
    isEraser: boolean;
    algorithm: FillAlgorithm;

    constructor(options: FillOptions) {
        super(options);
        this.point = options.point;
        this.isEraser = options.isEraser ?? false;
        this.algorithm = options.algorithm ?? "scanline";
    }

    getBoundingBox(): BoundingBox {
        return { x: this.point.x, y: this.point.y, width: 1, height: 1 };
    }

    moveBy(dx: number, dy: number): void {
        this.point.x += dx;
        this.point.y += dy;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        if(this.algorithm === "scanline") {
            ScanLineFill.fill(
                ctx,
                this.point,
                this.isEraser ? "#000000" : this.strokeStyle,
                this.pixelSize,
                this.isEraser,
                true
            );
        } else {
            FloodFill.fill(
                ctx, 
                this.point, 
                this.isEraser ? "#000000" : this.strokeStyle, 
                this.pixelSize, 
                this.isEraser, 
                true
            );
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        if(this.algorithm === "scanline") {
            ScanLineFill.fill(
                ctx,
                this.point,
                this.isEraser ? "#000000" : this.strokeStyle,
                this.pixelSize,
                this.isEraser,
                false
            );
        } else {
            FloodFill.fill(
                ctx, 
                this.point, 
                this.isEraser ? "#000000" : this.strokeStyle, 
                this.pixelSize, 
                this.isEraser, 
                false
            );
        }
    }
}