import type { Point } from "./ShapeTypes";
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

type ShapeGeneratorProps = {
    start: Point;
    end: Point;
    color: string;
    thickness: number;
    kind: string;
    pixelated?: boolean;
    pixelSize?: number;
};

const generator = ({ start, end, color, thickness, kind, pixelated = false, pixelSize = 20 }: ShapeGeneratorProps) => {
    switch (kind) {
        case "line":
            return new Line(start, end, { 
                strokeStyle: color, 
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "square":
            return new Square(start, end, { 
                strokeStyle: color, 
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "rect":
            return new Rectangle(start, end, { 
                strokeStyle: color, 
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "circle":
            return new Circle(start, end, { 
                strokeStyle: color, 
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "arrow":
            return new Arrow(start, end, { 
                strokeStyle: color, 
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "triangle":
            return new Triangle(start, end, {
                strokeStyle: color,
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "diamond":
            return new Diamond(start, end, {
                strokeStyle: color,
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "pentagon":
            return new Pentagon(start, end, {
                strokeStyle: color,
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "hexagon":
            return new Hexagon(start, end, {
                strokeStyle: color,
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "octagon":
            return new Octagon(start, end, {
                strokeStyle: color,
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        case "star":
            return new Star(start, end, {
                strokeStyle: color,
                lineWidth: thickness,
                pixelated: pixelated,
                pixelSize: pixelSize
            });
        default:
            throw new Error(`Unknown shape kind: ${kind}`);
    }
};

export default generator;
