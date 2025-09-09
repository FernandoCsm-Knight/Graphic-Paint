export type Point = { x: number; y: number };
export type RGBA = { r: number; g: number; b: number; a: number };
export type Geometric = 'circle' | 'square' | 'triangle' | 'diamond' | 
                        'pentagon' | 'hexagon' | 'octagon' | 'star' | 
                        'rect' | 'line' | 'arrow' | 'board' | 'image' |
                        'freeform';

export const lineInfo = (start: Point, end: Point): { angle: number; size: number } => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = Math.hypot(end.x - start.x, end.y - start.y);
    return { angle, size };
};

export const map = (p: Point, pixelSize: number): Point => {
    return {
        x: Math.round(p.x / pixelSize),
        y: Math.round(p.y / pixelSize)
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
}

