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
export type ResizeOptions = { flipX?: boolean; flipY?: boolean };

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

    // ── Resize-origin cache ───────────────────────────────────────────────────
    // Populated by beginResize() so that every resizeToBoundingBox() call during
    // a drag always maps from the ORIGINAL (pre-drag) geometry instead of the
    // already-rounded current state, preventing accumulated rounding drift in
    // pixelated mode.
    protected _resizeOriginalPoints: Point[] | null = null;
    protected _resizeOriginalBounds: BoundingBox | null = null;
    protected _resizeRotation: number = 0;
    protected _resizeCenter: Point | null = null;
    protected _transformBounds: BoundingBox | null = null;
    protected _transformRotation: number = 0;

    // ── Rotate-origin cache ───────────────────────────────────────────────────
    // Populated by beginRotate() so that every rotateBy() call during a drag
    // always rotates from the ORIGINAL (pre-drag) geometry instead of the
    // already-rounded current state, preventing accumulated rounding drift in
    // pixelated mode.
    protected _rotateOriginalPoints: Point[] | null = null;
    protected _rotateOriginalTransformBounds: BoundingBox | null = null;
    protected _rotateOriginalTransformRotation: number = 0;

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
        const needsSave = this.lineDash.length > 0;
        if (needsSave) {
            ctx.save();
            ctx.setLineDash(this.lineDash);
        }
        if (this.pixelated) {
            ctx.fillStyle = this.strokeStyle;
            this.pixelatedDraw(ctx);
        } else {
            this.standardDraw(ctx);
        }
        if (needsSave) ctx.restore();
    }

    /**
     * Rotate the shape's geometry by `angle` radians around `pivot`.
     * The rotation is baked directly into the shape's data points, so no
     * `rotation` attribute is needed. For pixelated shapes, each resulting
     * coordinate is rounded to the nearest integer grid cell.
     *
     * To avoid accumulated rounding drift during a drag, call `beginRotate()`
     * once at drag-start (to freeze the original geometry) and `endRotate()`
     * at drag-end (to clear the frozen state). Every `rotateBy` call while
     * frozen always rotates from the original geometry by the total delta,
     * rounding only once.
     */
    abstract rotateBy(angle: number, pivot: Point): void;

    /**
     * Called at the start of a rotation drag to freeze the current geometry.
     * Default: snapshots `this.points` if the shape stores polygon vertices
     * in a `points: Point[]` field (all polygon shapes).
     */
    beginRotate(): void {
        this.beginRotateTransformFrame();
        const self = this as this & { points?: Point[] };
        if (Array.isArray(self.points)) {
            this._rotateOriginalPoints = self.points.map(p => ({ ...p }));
        }
    }

    /** Called when the rotation drag ends. Clears the frozen origin. */
    endRotate(): void {
        this._rotateOriginalPoints = null;
        this._rotateOriginalTransformBounds = null;
    }

    /**
     * Returns the axis-aligned bounding box of the shape's current geometry in
     * document coordinates. Used for overlay drawing and hit-testing.
     */
    abstract getBoundingBox(): BoundingBox;

    /**
     * Returns the geometric center of the shape, used as the default rotation
     * pivot when none is specified. Derived from getBoundingBox() — override
     * only if a shape has a natural center that differs from its bbox center.
     */
    getCenter(): Point {
        const bb = this.getBoundingBox();
        return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    }

    /**
     * Returns the visual rotation angle used by the pending-placement overlay.
     * Shapes with baked geometry can keep the default zero angle.
     */
    getVisualRotation(): number {
        return this._transformRotation;
    }

    /**
     * Returns the unrotated bounding box used as the overlay's local box.
     * By default this is the regular bounding box.
     */
    getOverlayBounds(): BoundingBox {
        return this._transformBounds ?? this.getBoundingBox();
    }

    restoreTransformFrame(bounds: BoundingBox | null, rotation: number = 0): void {
        this._transformBounds = bounds ? { ...bounds } : null;
        this._transformRotation = rotation;
    }

    abstract moveBy(dx: number, dy: number): void;

    /**
     * Resizes the shape to occupy the provided axis-aligned bounding box before
     * any rotation is applied. Shapes that do not support resizing can keep the
     * default no-op implementation.
     */
    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        void bounds;
        void options;
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
    beginResize(
        bounds: BoundingBox = this.getBoundingBox(),
        rotation: number = 0,
        center: Point = this.getCenter(),
    ): void {
        const self = this as this & { points?: Point[] };
        if (Array.isArray(self.points)) {
            this._resizeOriginalPoints = self.points.map(p => ({ ...p }));
        }
        this._resizeOriginalBounds = bounds;
        this._resizeRotation = rotation;
        this._resizeCenter = { ...center };
        this.setTransformFrame(bounds, rotation);
    }

    /** Called when the resize drag ends. Clears the cached origin. */
    endResize(): void {
        this._resizeOriginalPoints = null;
        this._resizeOriginalBounds = null;
        this._resizeRotation = 0;
        this._resizeCenter = null;
    }

    /**
     * Rotates every point in `current` around `pivot` by `angle` radians,
     * always mapping from the `frozen` snapshot (when present) so that a
     * single drag never accumulates rounding error across frames.
     * For pixelated shapes the result is rounded to integer grid coordinates.
     */
    protected rotatePoints(
        current: Point[],
        frozen: Point[] | null,
        angle: number,
        pivot: Point,
    ): void {
        const src = frozen ?? current;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        for (let i = 0; i < current.length; i++) {
            const dx = src[i].x - pivot.x, dy = src[i].y - pivot.y;
            let x = pivot.x + dx * cos - dy * sin;
            let y = pivot.y + dx * sin + dy * cos;
            if (this.pixelated) { x = Math.round(x); y = Math.round(y); }
            current[i].x = x;
            current[i].y = y;
        }
        this.applyRotationToTransformFrame(angle, pivot);
    }

    /**
     * Rotates a single point around `pivot` by the pre-computed cosine/sine.
     * For pixelated shapes the result is rounded to integer grid coordinates.
     */
    protected rotateOnePoint(
        src: Point,
        pivot: Point,
        cos: number,
        sin: number,
        roundToGrid: boolean = this.pixelated,
    ): Point {
        const dx = src.x - pivot.x, dy = src.y - pivot.y;
        let x = pivot.x + dx * cos - dy * sin;
        let y = pivot.y + dx * sin + dy * cos;
        if (roundToGrid) { x = Math.round(x); y = Math.round(y); }
        return { x, y };
    }

    protected mapPointToBoundingBox(
        point: Point,
        from: BoundingBox,
        to: BoundingBox,
        options: ResizeOptions = {},
    ): Point {
        const resizeCenter = this._resizeCenter;
        const hasResizeRotation = this._resizeRotation !== 0 && resizeCenter !== null;
        const sourcePoint = hasResizeRotation
            ? this.rotateOnePoint(point, resizeCenter!, Math.cos(-this._resizeRotation), Math.sin(-this._resizeRotation), false)
            : point;
        const ratioX = from.width === 0 ? 0.5 : (sourcePoint.x - from.x) / from.width;
        const ratioY = from.height === 0 ? 0.5 : (sourcePoint.y - from.y) / from.height;
        const nextRatioX = options.flipX ? 1 - ratioX : ratioX;
        const nextRatioY = options.flipY ? 1 - ratioY : ratioY;
        const localPoint = {
            x: to.x + nextRatioX * to.width,
            y: to.y + nextRatioY * to.height,
        };

        const nextPoint = hasResizeRotation
            ? this.rotateOnePoint(localPoint, resizeCenter!, Math.cos(this._resizeRotation), Math.sin(this._resizeRotation))
            : localPoint;

        return this.pixelated
            ? { x: Math.round(nextPoint.x), y: Math.round(nextPoint.y) }
            : nextPoint;
    }

    protected resizePointCollection(
        points: Point[],
        nextBounds: BoundingBox,
        options: ResizeOptions = {},
    ): boolean {
        // Use the frozen originals captured by beginResize() when available so
        // that accumulated rounding across multiple drag frames does not distort
        // the shape's proportions.
        const srcPoints = this._resizeOriginalPoints ?? points;
        const srcBounds = this._resizeOriginalBounds ?? this.getBoundingBox();
        for (let i = 0; i < points.length; i++) {
            const mapped = this.mapPointToBoundingBox(srcPoints[i], srcBounds, nextBounds, options);
            points[i].x = mapped.x;
            points[i].y = mapped.y;
        }
        this.applyResizeToTransformFrame(nextBounds, this._resizeRotation);
        return true;
    }

    protected translatePointCollection(points: Point[], dx: number, dy: number): void {
        for (const point of points) {
            point.x += dx;
            point.y += dy;
        }
        this.moveTransformFrame(dx, dy);
    }

    protected moveTransformFrame(dx: number, dy: number): void {
        const bounds = this.getOverlayBounds();
        this._transformBounds = {
            x: bounds.x + dx,
            y: bounds.y + dy,
            width: bounds.width,
            height: bounds.height,
        };
    }

    protected setTransformFrame(bounds: BoundingBox, rotation: number = this._transformRotation): void {
        this._transformBounds = { ...bounds };
        this._transformRotation = rotation;
    }

    protected beginRotateTransformFrame(): void {
        this._rotateOriginalTransformBounds = { ...this.getOverlayBounds() };
        this._rotateOriginalTransformRotation = this.getVisualRotation();
    }

    protected applyRotationToTransformFrame(angle: number, pivot: Point): void {
        const bounds = this._rotateOriginalTransformBounds ?? this.getOverlayBounds();
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
        const rotatedCenter = this.rotateOnePoint(center, pivot, Math.cos(angle), Math.sin(angle), false);
        this._transformBounds = {
            x: rotatedCenter.x - bounds.width / 2,
            y: rotatedCenter.y - bounds.height / 2,
            width: bounds.width,
            height: bounds.height,
        };
        this._transformRotation = this._rotateOriginalTransformRotation + angle;
    }

    protected applyResizeToTransformFrame(bounds: BoundingBox, rotation: number = this._transformRotation): void {
        if (rotation !== 0 && this._resizeCenter !== null) {
            // `bounds` is expressed in OBB-local frame (the pointer was unrotated into it
            // before the resize math). Rotate its centre back to world space so that
            // _transformBounds is always a world-space OBB (centre at world position,
            // width/height = pre-rotation dimensions), consistent with the convention
            // used by applyRotationToTransformFrame and moveTransformFrame.
            const localCenter: Point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            const worldCenter = this.rotateOnePoint(localCenter, this._resizeCenter, cos, sin, false);
            this._transformBounds = {
                x: worldCenter.x - bounds.width / 2,
                y: worldCenter.y - bounds.height / 2,
                width: bounds.width,
                height: bounds.height,
            };
        } else {
            this._transformBounds = { ...bounds };
        }
        this._transformRotation = rotation;
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


