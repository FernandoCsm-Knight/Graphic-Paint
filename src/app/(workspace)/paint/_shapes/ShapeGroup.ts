import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import type { Point } from "@/types/geometry";
import { getShapeVertices } from "../_utils/vertexUtils";

/**
 * A temporary container used during pending placement for pixelated selections.
 *
 * When rotated, `rotateBy` is cascaded to every child shape with the group's
 * center as the pivot, so all children rotate around a common point rather
 * than their own centres. Rotation is baked directly into each child's data
 * (same as all other shapes), so no canvas-transform rotation is applied here
 * and no "baking" step is needed on commit.
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
        this.moveTransformFrame(dx, dy);
    }

    override beginRotate(): void {
        this.beginRotateTransformFrame();
        for (const s of this.shapes) s.beginRotate();
    }

    override endRotate(): void {
        for (const s of this.shapes) s.endRotate();
    }

    /**
     * Rotate all child shapes around the given pivot (typically the group
     * center). Each child delegates to its own `rotateBy`, which bakes the
     * rotation into that child's data points.
     */
    rotateBy(angle: number, pivot: Point): void {
        for (const s of this.shapes) s.rotateBy(angle, pivot);
        this.applyRotationToTransformFrame(angle, pivot);
    }

    override beginResize(
        bounds: BoundingBox = this.getBoundingBox(),
        rotation: number = 0,
        center: Point = this.getCenter(),
    ): void {
        this._groupOriginalBounds = bounds;
        this._childOriginalBounds = this.shapes.map((shape) =>
            this.getChildBoundsInGroupSpace(shape, center, rotation)
        );
        this._resizeOriginalBounds = bounds;
        this._resizeRotation = rotation;
        this._resizeCenter = { ...center };
        this.setTransformFrame(bounds, rotation);
        for (let i = 0; i < this.shapes.length; i++) {
            const childBounds = this._childOriginalBounds[i];
            this.shapes[i].beginResize(childBounds, rotation, center);
        }
    }

    override endResize(): void {
        this._groupOriginalBounds = null;
        this._childOriginalBounds = null;
        this._resizeOriginalBounds = null;
        this._resizeRotation = 0;
        this._resizeCenter = null;
        for (const s of this.shapes) s.endResize();
    }

    /**
     * Resize the group by proportionally scaling each child shape's bounding box.
     * Always scales from the geometry frozen by beginResize() to avoid accumulated
     * rounding drift in pixelated mode.
     */
    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        const old      = this._groupOriginalBounds ?? this.getBoundingBox();
        const resizeCenter = this._resizeCenter ?? this.getCenter();
        const rotation = this._resizeRotation;
        const originals = this._childOriginalBounds ?? this.shapes.map((shape) =>
            this.getChildBoundsInGroupSpace(shape, resizeCenter, rotation)
        );
        if (old.width === 0 || old.height === 0) return false;
        if (bounds.width === 0 || bounds.height === 0) return false;

        const scaleX = bounds.width  / old.width;
        const scaleY = bounds.height / old.height;

        for (let i = 0; i < this.shapes.length; i++) {
            const sourceBounds = originals[i];
            const nextBounds = {
                x: options.flipX
                    ? bounds.x + (old.x + old.width - (sourceBounds.x + sourceBounds.width)) * scaleX
                    : bounds.x + (sourceBounds.x - old.x) * scaleX,
                y: options.flipY
                    ? bounds.y + (old.y + old.height - (sourceBounds.y + sourceBounds.height)) * scaleY
                    : bounds.y + (sourceBounds.y - old.y) * scaleY,
                width:  sourceBounds.width  * scaleX,
                height: sourceBounds.height * scaleY,
            };
            this.shapes[i].resizeToBoundingBox(
                this.normalizeAspectLockedBounds(this.shapes[i], nextBounds),
                options,
            );
        }
        this.applyResizeToTransformFrame(bounds, rotation);
        return true;
    }

    override draw(ctx: CanvasRenderingContext2D): void {
        for (const s of this.shapes) s.draw(ctx);
    }

    // Required abstract implementations — never called because draw() is overridden.
    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        for (const s of this.shapes) s.draw(ctx);
    }
    standardDraw(ctx: CanvasRenderingContext2D): void {
        for (const s of this.shapes) s.draw(ctx);
    }

    private getChildBoundsInGroupSpace(shape: Shape, pivot: Point, rotation: number): BoundingBox {
        const vertices = getShapeVertices(shape);
        if (vertices.length > 0) {
            const points = vertices.map(({ point }) =>
                rotation === 0
                    ? point
                    : this.rotateOnePoint(point, pivot, Math.cos(-rotation), Math.sin(-rotation), false)
            );
            return this.boundingBoxFromPoints(points);
        }

        const overlayBounds = shape.getOverlayBounds();
        return rotation === 0
            ? overlayBounds
            : this.projectBoundingBox(overlayBounds, pivot, -rotation);
    }

    private boundingBoxFromPoints(points: Point[]): BoundingBox {
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
        };
    }

    private normalizeAspectLockedBounds(shape: Shape, bounds: BoundingBox): BoundingBox {
        if (shape.kind !== 'circle' && shape.kind !== 'square') return bounds;

        const size = Math.min(bounds.width, bounds.height);
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
        return {
            x: center.x - size / 2,
            y: center.y - size / 2,
            width: size,
            height: size,
        };
    }

    private projectBoundingBox(bounds: BoundingBox, pivot: Point, angle: number): BoundingBox {
        const corners: Point[] = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height },
        ];
        const projected = corners.map((corner) =>
            this.rotateOnePoint(corner, pivot, Math.cos(angle), Math.sin(angle), false)
        );
        const xs = projected.map((point) => point.x);
        const ys = projected.map((point) => point.y);
        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
        };
    }

}
