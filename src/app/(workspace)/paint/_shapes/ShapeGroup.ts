import { Shape, type BoundingBox, type ShapeOptions } from "./ShapeTypes";
import { toPixels } from "../_types/Graphics";

/**
 * A temporary container used during pending placement for pixelated selections.
 *
 * The group applies a single rotation around its center (as a canvas transform)
 * while leaving each contained shape at its own position. On commit the caller
 * "bakes" the group rotation into each individual shape before pushing them to
 * the scene, so the result is a set of independent vector shapes that can be
 * re-selected and re-clipped.
 */
export default class ShapeGroup extends Shape {
    readonly kind = 'group' as const;
    readonly shapes: Shape[];

    // Frozen at beginResize() so that every resize frame scales from the
    // original pre-drag geometry, not from the already-rounded current state.
    private _groupOriginalBounds: BoundingBox | null = null;
    private _childOriginalBounds: BoundingBox[] | null = null;

    constructor(shapes: Shape[], opts: ShapeOptions = {}) {
        super(opts);
        this.shapes = shapes;
    }

    getBoundingBox(): BoundingBox {
        if (this.shapes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of this.shapes) {
            const bb = s.getBoundingBox();
            minX = Math.min(minX, bb.x);
            minY = Math.min(minY, bb.y);
            maxX = Math.max(maxX, bb.x + bb.width);
            maxY = Math.max(maxY, bb.y + bb.height);
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    moveBy(dx: number, dy: number): void {
        // Moving invalidates any cached resize origin.
        this._groupOriginalBounds = null;
        this._childOriginalBounds = null;
        for (const s of this.shapes) s.moveBy(dx, dy);
    }

    override beginResize(): void {
        this._groupOriginalBounds = this.getBoundingBox();
        this._childOriginalBounds = this.shapes.map(s => s.getBoundingBox());
        for (const s of this.shapes) s.beginResize();
    }

    override endResize(): void {
        this._groupOriginalBounds = null;
        this._childOriginalBounds = null;
        for (const s of this.shapes) s.endResize();
    }

    /**
     * Resize the group by proportionally scaling each child shape's bounding box.
     * Always scales from the geometry frozen by beginResize() to avoid accumulated
     * rounding drift in pixelated mode.
     */
    resizeToBoundingBox(bounds: BoundingBox): boolean {
        const old      = this._groupOriginalBounds ?? this.getBoundingBox();
        const originals = this._childOriginalBounds ?? this.shapes.map(s => s.getBoundingBox());
        if (old.width === 0 || old.height === 0) return false;
        if (bounds.width === 0 || bounds.height === 0) return false;

        const scaleX = bounds.width  / old.width;
        const scaleY = bounds.height / old.height;

        for (let i = 0; i < this.shapes.length; i++) {
            const sb = originals[i];
            this.shapes[i].resizeToBoundingBox({
                x:      bounds.x + (sb.x - old.x) * scaleX,
                y:      bounds.y + (sb.y - old.y) * scaleY,
                width:  sb.width  * scaleX,
                height: sb.height * scaleY,
            });
        }
        return true;
    }

    /**
     * Override draw to apply the group rotation as a canvas transform so that
     * each contained shape can still use its own coordinate system.
     * The rotation is NOT baked into the shapes here — that happens on commit.
     */
    override draw(ctx: CanvasRenderingContext2D): void {
        if (this.rotation !== 0) {
            const center = this.getCenter();
            const c = this.pixelated ? toPixels(center, this.pixelSize) : center;
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(this.rotation);
            ctx.translate(-c.x, -c.y);
            for (const s of this.shapes) s.draw(ctx);
            ctx.restore();
        } else {
            for (const s of this.shapes) s.draw(ctx);
        }
    }

    // Required abstract implementations — never called because draw() is overridden.
    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        for (const s of this.shapes) s.draw(ctx);
    }
    standardDraw(ctx: CanvasRenderingContext2D): void {
        for (const s of this.shapes) s.draw(ctx);
    }
}
