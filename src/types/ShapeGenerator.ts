import type { Point } from "./Graphics";
import type { LineAlgorithm } from "../context/SettingsContext";
import type { Shape, ShapeOptions } from "./ShapeTypes";
import Line from "../shapes/Line";
import Circle from "../shapes/Circle";
import Octagon from "../shapes/Octagon";
import Hexagon from "../shapes/Hexagon";
import Star from "../shapes/Star";
import Triangle from "../shapes/Triangle";
import Square from "../shapes/Square";
import Rectangle from "../shapes/Rectangle";
import Pentagon from "../shapes/Pentagon";
import Diamond from "../shapes/Diamond";
import Arrow from "../shapes/Arrow";
import Heptagon from "../shapes/Heptagon";
import Ellipse from "../shapes/Ellipse";

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
    lineAlgorithm = 'bresenham' 
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
