import type { BoundingBox, Shape } from "../_shapes/ShapeTypes";
import { toPixels } from "../_types/Graphics";
import type { Point } from "@/types/geometry";

export const getInclusivePixelBoundingBox = (
    bounds: BoundingBox,
    pixelSize: number,
): BoundingBox => {
    const origin = toPixels({ x: bounds.x, y: bounds.y }, pixelSize);
    return {
        ...origin,
        width:  (bounds.width  + 1) * pixelSize,
        height: (bounds.height + 1) * pixelSize,
    };
};

export const getShapeBoundingBoxInDocSpace = (shape: Shape): BoundingBox => {
    const bounds = shape.getBoundingBox();
    return shape.pixelated
        ? getInclusivePixelBoundingBox(bounds, shape.pixelSize)
        : bounds;
};

export const normalizeGridBoundingBox = (bounds: BoundingBox): BoundingBox => {
    const x = Math.floor(bounds.x);
    const y = Math.floor(bounds.y);
    const maxX = Math.max(x, Math.ceil(bounds.x + bounds.width));
    const maxY = Math.max(y, Math.ceil(bounds.y + bounds.height));

    return {
        x,
        y,
        width: maxX - x,
        height: maxY - y,
    };
};

export const unionBoundingBoxes = (first: BoundingBox, second: BoundingBox): BoundingBox => {
    const x = Math.min(first.x, second.x);
    const y = Math.min(first.y, second.y);
    const maxX = Math.max(first.x + first.width, second.x + second.width);
    const maxY = Math.max(first.y + first.height, second.y + second.height);

    return {
        x,
        y,
        width: maxX - x,
        height: maxY - y,
    };
};

export const moveBoundingBox = (bounds: BoundingBox, dx: number, dy: number): BoundingBox => ({
    ...bounds,
    x: bounds.x + dx,
    y: bounds.y + dy,
});

export const isPointInsideBoundingBoxInclusive = (point: Point, bounds: BoundingBox): boolean => (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
);
