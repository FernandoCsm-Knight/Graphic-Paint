import { cohenSutherland, type ClipWindow } from "../_algorithms/CohenSutherland";
import { liangBarsky } from "../_algorithms/LiangBarsky";
import { sutherlandHodgman } from "../_algorithms/SutherlandHodgman";
import type { ClipAlgorithm } from "../_context/SettingsContext";
import type { SceneItem } from "../_hooks/useScene";
import { Shape, type BoundingBox } from "../_shapes/ShapeTypes";
import {
    getShapeLocalBoundingBox,
    normalizeGridBoundingBox,
    unionBoundingBoxes,
} from "./boundingBox";
import type { Point } from "@/types/geometry";

export type LineShape = Shape & { kind: "line" | "arrow"; start: Point; end: Point };
export type PolyShape = Shape & { points: Point[] };
export type PixelClipShape = LineShape | PolyShape;

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

const areSamePoint = (first: Point, second: Point): boolean =>
    first.x === second.x && first.y === second.y;

export const createPixelBoundsFromDocPoints = (
    start: Point,
    end: Point,
    pixelSize: number,
): BoundingBox => {
    const startX = Math.round(start.x / pixelSize);
    const startY = Math.round(start.y / pixelSize);
    const endX = Math.round(end.x / pixelSize);
    const endY = Math.round(end.y / pixelSize);

    return {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
    };
};

export const createClipWindowFromBounds = (bounds: BoundingBox): ClipWindow => ({
    xMin: bounds.x,
    yMin: bounds.y,
    xMax: bounds.x + bounds.width,
    yMax: bounds.y + bounds.height,
});

const normalizeClippedPoint = (point: Point, win: ClipWindow): Point => ({
    x: clamp(Math.round(point.x), win.xMin, win.xMax),
    y: clamp(Math.round(point.y), win.yMin, win.yMax),
});

const normalizeClippedLine = (
    segment: { p1: Point; p2: Point },
    win: ClipWindow,
): { p1: Point; p2: Point } => ({
    p1: normalizeClippedPoint(segment.p1, win),
    p2: normalizeClippedPoint(segment.p2, win),
});

const normalizePolygonPoints = (points: Point[], win: ClipWindow): Point[] => {
    const normalized = points
        .map((point) => normalizeClippedPoint(point, win))
        .filter((point, index, allPoints) => index === 0 || !areSamePoint(point, allPoints[index - 1]));

    if (normalized.length > 1 && areSamePoint(normalized[0], normalized[normalized.length - 1])) {
        normalized.pop();
    }

    return normalized;
};

const isLineShape = (shape: Shape): shape is LineShape =>
    shape.kind === "line" || shape.kind === "arrow";

const isPolyShape = (shape: Shape): shape is PolyShape =>
    "points" in shape && Array.isArray((shape as PolyShape).points);

const getCombinedPixelBounds = (shapes: PixelClipShape[]): BoundingBox | null => {
    let bounds: BoundingBox | null = null;

    for (const shape of shapes) {
        const nextBounds = normalizeGridBoundingBox(getShapeLocalBoundingBox(shape));
        bounds = bounds === null ? nextBounds : unionBoundingBoxes(bounds, nextBounds);
    }

    return bounds;
};

type ClipSceneItemsInput = {
    scene: SceneItem[];
    clipAlgorithm: ClipAlgorithm;
    bounds: BoundingBox;
};

type ClipSceneItemsOutput = {
    floatingShapes: PixelClipShape[];
    keepInScene: SceneItem[];
    floatingBounds: BoundingBox | null;
};

export const clipSceneItemsToPixelBounds = ({
    scene,
    clipAlgorithm,
    bounds,
}: ClipSceneItemsInput): ClipSceneItemsOutput => {
    const win = createClipWindowFromBounds(bounds);
    const floatingShapes: PixelClipShape[] = [];
    const keepInScene: SceneItem[] = [];
    const isLineClip = clipAlgorithm !== "sutherland-hodgman";

    for (const item of scene) {
        if (!(item instanceof Shape)) {
            keepInScene.push(item);
            continue;
        }

        if (isLineClip && isLineShape(item)) {
            const clipLine = clipAlgorithm === "liang-barsky" ? liangBarsky : cohenSutherland;
            const clipped = clipLine(item.start, item.end, win);
            const normalized = clipped ? normalizeClippedLine(clipped, win) : null;

            if (!normalized) {
                keepInScene.push(item);
                continue;
            }

            // Clone the shape so the original stays in the scene unchanged.
            const clone = Object.assign(Object.create(Object.getPrototypeOf(item)), item) as LineShape;
            clone.start = { ...normalized.p1 };
            clone.end = { ...normalized.p2 };
            floatingShapes.push(clone);
            keepInScene.push(item);
            continue;
        }

        if (!isLineClip && isPolyShape(item)) {
            const clipped = normalizePolygonPoints(sutherlandHodgman(item.points, win), win);

            if (clipped.length < 2) {
                keepInScene.push(item);
                continue;
            }

            // Clone the shape so the original stays in the scene unchanged.
            const clone = Object.assign(Object.create(Object.getPrototypeOf(item)), item) as PolyShape;
            clone.points = clipped;
            floatingShapes.push(clone);
            keepInScene.push(item);
            continue;
        }

        keepInScene.push(item);
    }

    return {
        floatingShapes,
        keepInScene,
        floatingBounds: getCombinedPixelBounds(floatingShapes),
    };
};
