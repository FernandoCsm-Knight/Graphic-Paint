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
};

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

    return new ShapeClass(start, end, options);
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
