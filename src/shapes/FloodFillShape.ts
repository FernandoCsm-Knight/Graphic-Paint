import { Shape, type ShapeOptions } from "../types/ShapeTypes";
import { type Geometric, type Point } from "../types/Graphics";
import FloodFill from "../algorithms/FloodFill";

export interface FloodFillOptions extends ShapeOptions {
    isEraser?: boolean;
    point: Point;
}

export default class FloodFillShape extends Shape {
    kind: Geometric = "floodfill";
    point: Point;
    isEraser: boolean;

    constructor(options: FloodFillOptions) {
        super(options);
        this.point = options.point;
        this.isEraser = options.isEraser ?? false;
    }

    contains(): boolean {
        return false;
    }

    moveBy(dx: number, dy: number): void {
        this.point.x += dx;
        this.point.y += dy;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        FloodFill.fill(
            ctx, 
            this.point, 
            this.isEraser ? "#000000" : this.strokeStyle, 
            this.pixelSize, 
            this.isEraser, 
            true
        );
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
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