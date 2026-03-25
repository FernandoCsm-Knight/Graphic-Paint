export type Point = {
    x: number;
    y: number;
};

export type RGBA = { 
    r: number; 
    g: number; 
    b: number; 
    a: number 
};

export const distanceBetween = (start: Point, end: Point) => Math.hypot(end.x - start.x, end.y - start.y);

export const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) ?? ["00", "00", "00"];
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255
    };
}

