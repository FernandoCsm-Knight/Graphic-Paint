import type { BoundingBox, Shape } from "../_shapes/ShapeTypes";
import { toPixels } from "../_types/Graphics";
import type { Point } from "@/types/geometry";

export const getShapeLocalBoundingBox = (shape: Shape): BoundingBox => shape.getBoundingBox();

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

export const getShapeDocBoundingBox = (shape: Shape): BoundingBox => {
    const bounds = getShapeLocalBoundingBox(shape);
    return shape.pixelated
        ? getInclusivePixelBoundingBox(bounds, shape.pixelSize)
        : bounds;
};

export const getShapeOverlayBoundingBox = (shape: Shape): BoundingBox => {
    const bounds = shape.getOverlayBounds();
    return shape.pixelated
        ? getInclusivePixelBoundingBox(bounds, shape.pixelSize)
        : bounds;
};

export const getBoundingBoxCenter = (bounds: BoundingBox): Point => ({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
});

export const getBoundingBoxCorners = (bounds: BoundingBox) => ({
    nw: { x: bounds.x, y: bounds.y },
    n: { x: bounds.x + bounds.width / 2, y: bounds.y },
    ne: { x: bounds.x + bounds.width, y: bounds.y },
    e: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    se: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    s: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    sw: { x: bounds.x, y: bounds.y + bounds.height },
    w: { x: bounds.x, y: bounds.y + bounds.height / 2 },
});

export const normalizeBoundingBox = (first: Point, second: Point): BoundingBox => ({
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    width: Math.abs(second.x - first.x),
    height: Math.abs(second.y - first.y),
});

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

export const rectsIntersect = (first: BoundingBox, second: BoundingBox): boolean => (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
);

export const isPointInsideBoundingBoxInclusive = (point: Point, bounds: BoundingBox): boolean => (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
);

export const getShapeBoundingBoxInDocSpace = getShapeDocBoundingBox;
