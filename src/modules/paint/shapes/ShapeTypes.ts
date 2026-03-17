import type { Geometric } from "../types/Graphics";
import type { Point } from "../../../functions/geometry";
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

export type BoundingBox = { x: number; y: number; width: number; height: number };

export abstract class SceneItem {
    abstract draw(ctx: CanvasRenderingContext2D): void;

    /** True if this item is a full-canvas raster restore point. */
    isCheckpoint(): boolean { return false; }

    /** True if this item must captureSnapshot() before being committed to the scene. */
    requiresSnapshot(): boolean { return false; }

    /** Captures the current canvas state into this item after draw. No-op by default. */
    captureSnapshot(ctx: CanvasRenderingContext2D): void { void ctx; }
}

export abstract class Shape extends SceneItem {
    abstract readonly kind: Geometric;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    filled: boolean;
    pixelated: boolean;
    pixelSize: number;
    lineAlgorithm: LineAlgorithm;
    rotation: number = 0;

    constructor(opts: ShapeOptions) {
        super();
        this.strokeStyle = opts.strokeStyle ?? '#000000';
        this.fillStyle = opts.fillStyle ?? '#FFFFFF';
        this.lineWidth = opts.lineWidth ?? 1;
        this.filled = opts.filled ?? false;
        this.pixelated = opts.pixelated ?? false;
        this.pixelSize = opts.pixelSize ?? 20;
        this.lineAlgorithm = opts.lineAlgorithm ?? 'bresenham';
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const needsRotation = this.rotation !== 0;
        if (needsRotation) {
            const { x: cx, y: cy } = this.getCenter();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.rotation);
            ctx.translate(-cx, -cy);
        }
        if (this.pixelated) {
            ctx.fillStyle = this.strokeStyle;
            this.pixelatedDraw(ctx);
        } else {
            this.standardDraw(ctx);
        }
        if (needsRotation) ctx.restore();
    }

    /** Set the absolute rotation angle (radians) around getCenter(). */
    rotateTo(angle: number): void {
        this.rotation = angle;
    }

    /**
     * Returns the axis-aligned bounding box of the shape geometry in document
     * coordinates, BEFORE any rotation is applied. Used for overlay drawing and
     * hit-testing in pending-placement mode.
     */
    abstract getBoundingBox(): BoundingBox;

    /**
     * Returns the geometric center of the shape, used as the rotation pivot.
     * Derived from getBoundingBox() — override only if a shape has a natural
     * center that differs from its bbox center (e.g. Circle).
     */
    getCenter(): Point {
        const bb = this.getBoundingBox();
        return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    }

    abstract moveBy(dx: number, dy: number): void;

    /**
     * Resizes the shape to occupy the provided axis-aligned bounding box before
     * any rotation is applied. Shapes that do not support resizing can keep the
     * default no-op implementation.
     */
    resizeToBoundingBox(bounds: BoundingBox): boolean {
        void bounds;
        return false;
    }

    protected mapPointToBoundingBox(point: Point, from: BoundingBox, to: BoundingBox): Point {
        const ratioX = from.width === 0 ? 0.5 : (point.x - from.x) / from.width;
        const ratioY = from.height === 0 ? 0.5 : (point.y - from.y) / from.height;
        const nextPoint = {
            x: to.x + ratioX * to.width,
            y: to.y + ratioY * to.height,
        };

        return this.pixelated
            ? { x: Math.round(nextPoint.x), y: Math.round(nextPoint.y) }
            : nextPoint;
    }

    protected resizePointCollection(points: Point[], nextBounds: BoundingBox): boolean {
        const currentBounds = this.getBoundingBox();
        for (const point of points) {
            const mapped = this.mapPointToBoundingBox(point, currentBounds, nextBounds);
            point.x = mapped.x;
            point.y = mapped.y;
        }
        return true;
    }

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


