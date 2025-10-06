export type Point = { x: number; y: number };
export type RGBA = { r: number; g: number; b: number; a: number };
export type Geometric = 'circle' | 'square' | 'triangle' | 'diamond' | 
                        'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'star' | 
                        'rect' | 'line' | 'arrow' | 'board' | 'image' |
                        'freeform' | 'ellipse' | 'floodfill';

export const lineInfo = (start: Point, end: Point): { angle: number; size: number } => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = Math.hypot(end.x - start.x, end.y - start.y);
    return { angle, size };
};

export const map = (p: Point, pixelSize: number): Point => {
    return {
        x: Math.floor(p.x / pixelSize),
        y: Math.floor(p.y / pixelSize)
    };
}

export const pixelCenter = (p: Point, pixelSize: number): Point => {
    const point = (Number.isInteger(p.x) && Number.isInteger(p.y)) ? p : map(p, pixelSize); 
    
    return {
        x: point.x * pixelSize + Math.floor(pixelSize / 2),
        y: point.y * pixelSize + Math.floor(pixelSize / 2)
    };
};

export const isSameColor = (color: RGBA, target: RGBA, tolerance: number): boolean => {
    return (
        Math.abs(color.r - target.r) <= tolerance && 
        Math.abs(color.g - target.g) <= tolerance &&
        Math.abs(color.b - target.b) <= tolerance &&
        Math.abs(color.a - target.a) <= tolerance 
    );
};

export const createPolygon = (sides: number, start: Point, end: Point): Point[] => {
    const { angle, size } = lineInfo(start, end);

    const points: Point[] = [];
    for(let i = 0; i < sides; i++) {
        const adjust = (i * Math.PI) / (sides / 2);
        points.push({
            x: Math.round(start.x + size * Math.cos(angle + adjust)),
            y: Math.round(start.y + size * Math.sin(angle + adjust))
        });
    }

    return points;
};

