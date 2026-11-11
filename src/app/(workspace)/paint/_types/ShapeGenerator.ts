import type { Point } from "@/types/geometry";
import type { LineAlgorithm } from "../_context/SettingsContext";
import type { Shape, ShapeOptions } from "../_shapes/ShapeTypes";
import Line from "../_shapes/Line";
import Circle from "../_shapes/Circle";
import Octagon from "../_shapes/Octagon";
import Hexagon from "../_shapes/Hexagon";
import Star from "../_shapes/Star";
import Triangle from "../_shapes/Triangle";
import Square from "../_shapes/Square";
import Rectangle from "../_shapes/Rectangle";
import Pentagon from "../_shapes/Pentagon";
import Diamond from "../_shapes/Diamond";
import Arrow from "../_shapes/Arrow";
import Heptagon from "../_shapes/Heptagon";
import Ellipse from "../_shapes/Ellipse";
import {
    computeDragBox,
    computeDragLine,
    fitPointsToBox,
    regularPolygonUnit,
    starUnit,
    type DragModifiers,
} from "../_utils/dragShapeGeometry";

// Type for shape constructor
type ShapeConstructor = new (start: Point, end: Point, opts: ShapeOptions) => Shape;

// Registry of all available shapes
const SHAPE_REGISTRY: Record<string, ShapeConstructor> = {
    line: Line,
    square: Square,
    rect: Rectangle,
    circle: Circle,
    ellipse: Ellipse,
    arrow: Arrow,
    triangle: Triangle,
    diamond: Diamond,
    pentagon: Pentagon,
    hexagon: Hexagon,
    heptagon: Heptagon,
    octagon: Octagon,
    star: Star,
} as const;

export type ShapeKind = keyof typeof SHAPE_REGISTRY;

type ShapeGeneratorProps = {
    start: Point;
    end: Point;
    color: string;
    thickness: number;
    kind: string;
    pixelated?: boolean;
    pixelSize?: number;
    lineAlgorithm?: LineAlgorithm;
    lineDash?: number[];
    /** Shift = keep proportions / snap lines to 45°, Alt = from the centre. */
    modifiers?: DragModifiers;
};

/** Unit outline of each regular shape, stretched to fill the drag box. */
const UNIT_OUTLINES: Partial<Record<string, () => Point[]>> = {
    triangle: () => regularPolygonUnit(3),
    diamond: () => regularPolygonUnit(4, true),
    pentagon: () => regularPolygonUnit(5),
    hexagon: () => regularPolygonUnit(6),
    heptagon: () => regularPolygonUnit(7),
    octagon: () => regularPolygonUnit(8),
    star: () => starUnit(),
};

/** Shapes that always keep their proportions (as if Shift were held). */
const ALWAYS_PROPORTIONAL = new Set(['square', 'circle']);

/**
 * Factory function to create shapes based on the shape kind.
 * Uses a registry pattern to avoid repetitive switch statements.
 * 
 * @param props - Shape generation properties
 * @returns A new Shape instance
 * @throws Error if the shape kind is not registered
 */
const generator = ({
    start,
    end,
    color,
    thickness,
    kind,
    pixelated = false,
    pixelSize = 20,
    lineAlgorithm = 'bresenham',
    lineDash = [],
    modifiers = {},
}: ShapeGeneratorProps): Shape => {
    const ShapeClass = SHAPE_REGISTRY[kind];

    if (!ShapeClass) {
        throw new Error(`Unknown shape kind: ${kind}. Available shapes: ${Object.keys(SHAPE_REGISTRY).join(', ')}`);
    }

    const options: ShapeOptions = {
        strokeStyle: color,
        lineWidth: thickness,
        pixelated,
        pixelSize,
        lineAlgorithm,
        lineDash,
    };

    // Lines: from the press point to the pointer (Shift snaps to 45°, Alt mirrors).
    if (kind === 'line' || kind === 'arrow') {
        const line = computeDragLine(start, end, modifiers, pixelated);
        return new ShapeClass(line.start, line.end, options);
    }

    // Everything else is inscribed in the drag box (corner to corner).
    const box = computeDragBox(start, end, {
        proportional: Boolean(modifiers.shift) || ALWAYS_PROPORTIONAL.has(kind),
        fromCenter: Boolean(modifiers.alt),
    });
    const topLeft = { x: box.x, y: box.y };
    const bottomRight = { x: box.x + box.width, y: box.y + box.height };

    if (kind === 'circle') {
        const cy = box.y + box.height / 2;
        // Circle takes the two ends of a diameter.
        return new ShapeClass({ x: box.x, y: cy }, { x: box.x + box.width, y: cy }, options);
    }

    const unitOutline = UNIT_OUTLINES[kind];
    if (unitOutline) {
        const shape = new ShapeClass(topLeft, bottomRight, options) as Shape & { points: Point[] };
        shape.points = fitPointsToBox(unitOutline(), box, pixelated);
        return shape;
    }

    // rect, square, ellipse: constructed directly from the box corners.
    return new ShapeClass(topLeft, bottomRight, options);
};

/**
 * Gets all available shape kinds
 */
export const getAvailableShapes = (): ShapeKind[] => {
    return Object.keys(SHAPE_REGISTRY) as ShapeKind[];
};

/**
 * Checks if a shape kind is registered
 */
export const isValidShapeKind = (kind: string): kind is ShapeKind => {
    return kind in SHAPE_REGISTRY;
};

/**
 * Registers a new shape type to the factory
 * Useful for adding custom shapes dynamically
 */
export const registerShape = (kind: string, ShapeClass: ShapeConstructor): void => {
    if (kind in SHAPE_REGISTRY) {
        console.warn(`Shape "${kind}" is already registered. Overwriting...`);
    }
    SHAPE_REGISTRY[kind] = ShapeClass;
};

export default generator;
