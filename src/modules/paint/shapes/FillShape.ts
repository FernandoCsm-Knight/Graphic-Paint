import { SceneItem, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import type { Point } from "../../../functions/geometry";
import FloodFill from "../algorithms/FloodFill";
import ScanLineFill from "../algorithms/ScanLineFill";
import type { FillAlgorithm } from "../context/SettingsContext";

export interface FillOptions extends ShapeOptions {
    algorithm?: FillAlgorithm;
    isEraser?: boolean;
    point: Point;
}

export default class FillShape extends SceneItem {
    kind = 'floodfill' as const;

    strokeStyle: string;
    pixelated: boolean;
    pixelSize: number;
    isEraser: boolean;
    algorithm: FillAlgorithm;
    point: Point;

    private snapshot: ImageData | null = null;

    constructor(options: FillOptions) {
        super();
        this.strokeStyle = options.strokeStyle ?? '#000000';
        this.pixelated = options.pixelated ?? false;
        this.pixelSize = options.pixelSize ?? 20;
        this.isEraser = options.isEraser ?? false;
        this.algorithm = options.algorithm ?? "scanline";
        this.point = options.point;
    }

    override captureSnapshot(ctx: CanvasRenderingContext2D): void {
        this.snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    override isCheckpoint(): boolean { return this.snapshot !== null; }

    override requiresSnapshot(): boolean { return true; }

    override draw(ctx: CanvasRenderingContext2D): void {
        if (this.snapshot !== null) {
            ctx.putImageData(this.snapshot, 0, 0);
            return;
        }
        if (this.algorithm === "scanline") {
            ScanLineFill.fill(ctx, this.point, this.isEraser ? "#000000" : this.strokeStyle, this.pixelSize, this.isEraser, this.pixelated);
        } else {
            FloodFill.fill(ctx, this.point, this.isEraser ? "#000000" : this.strokeStyle, this.pixelSize, this.isEraser, this.pixelated);
        }
    }

    getBoundingBox(): BoundingBox {
        return { x: this.point.x, y: this.point.y, width: 1, height: 1 };
    }

    moveBy(dx: number, dy: number): void {
        this.point.x += dx;
        this.point.y += dy;
    }
}
