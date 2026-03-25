import type { Geometric } from "../_types/Graphics";
import { toPixels } from "../_types/Graphics";
import type { Point } from "@/types/geometry";
import type { LineAlgorithm } from "../_context/SettingsContext";

export type ShapeOptions = {
    strokeStyle?: string;
    fillStyle?: string;
    lineWidth?: number;
    filled?: boolean;
    pixelated?: boolean;
    pixelSize?: number;
    lineAlgorithm?: LineAlgorithm;
    lineDash?: number[];
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
    lineDash: number[];
    rotation: number = 0;

    // ── Resize-origin cache ───────────────────────────────────────────────────
    // Populated by beginResize() so that every resizeToBoundingBox() call during
    // a drag always maps from the ORIGINAL (pre-drag) geometry instead of the
    // already-rounded current state, preventing accumulated rounding drift in
    // pixelated mode.
    protected _resizeOriginalPoints: Point[] | null = null;
    protected _resizeOriginalBounds: BoundingBox | null = null;

    constructor(opts: ShapeOptions) {
        super();
        this.strokeStyle = opts.strokeStyle ?? '#000000';
        this.fillStyle = opts.fillStyle ?? '#FFFFFF';
        this.lineWidth = opts.lineWidth ?? 1;
        this.filled = opts.filled ?? false;
        this.pixelated = opts.pixelated ?? false;
        this.pixelSize = opts.pixelSize ?? 20;
        this.lineAlgorithm = opts.lineAlgorithm ?? 'bresenham';
        this.lineDash = opts.lineDash ?? [];
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const needsSave = this.rotation !== 0 || this.lineDash.length > 0;
        if (needsSave) {
            ctx.save();
            if (this.lineDash.length > 0) ctx.setLineDash(this.lineDash);
            if (this.rotation !== 0) {
                const center = this.getCenter();
                // getCenter() returns grid-unit coords for pixelated shapes; the canvas
                // always works in doc pixels, so we must scale before translating.
                const c = this.pixelated ? toPixels(center, this.pixelSize) : center;
                ctx.translate(c.x, c.y);
                ctx.rotate(this.rotation);
                ctx.translate(-c.x, -c.y);
            }
        }
        if (this.pixelated) {
            ctx.fillStyle = this.strokeStyle;
            this.pixelatedDraw(ctx);
        } else {
            this.standardDraw(ctx);
        }
        if (needsSave) ctx.restore();
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

    /**
     * Called by usePendingPlacement when a resize drag begins.
     * Shapes that use resizePointCollection override this to snapshot their
     * current points so subsequent resizeToBoundingBox calls always map from
     * the original geometry, not from the already-rounded current state.
     *
     * The default implementation handles any shape that stores its geometry in
     * a `points: Point[]` field (all polygon shapes).
     */
    beginResize(): void {
        const self = this as this & { points?: Point[] };
        if (Array.isArray(self.points)) {
            this._resizeOriginalPoints = self.points.map(p => ({ ...p }));
            this._resizeOriginalBounds = this.getBoundingBox();
        }
    }

    /** Called when the resize drag ends. Clears the cached origin. */
    endResize(): void {
        this._resizeOriginalPoints = null;
        this._resizeOriginalBounds = null;
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
        // Use the frozen originals captured by beginResize() when available so
        // that accumulated rounding across multiple drag frames does not distort
        // the shape's proportions.
        const srcPoints = this._resizeOriginalPoints ?? points;
        const srcBounds = this._resizeOriginalBounds ?? this.getBoundingBox();
        for (let i = 0; i < points.length; i++) {
            const mapped = this.mapPointToBoundingBox(srcPoints[i], srcBounds, nextBounds);
            points[i].x = mapped.x;
            points[i].y = mapped.y;
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
                const { x: pixelX, y: pixelY } = toPixels({ x: p.x + dx, y: p.y + dy }, this.pixelSize);
                ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
            }
        }
    }
};


