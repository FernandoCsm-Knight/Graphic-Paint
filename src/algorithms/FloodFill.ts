import type { Point } from "../types/ShapeTypes";

type RGBA = { r: number; g: number; b: number; a: number };

export class FloodFill {
    static fill(
        ctx: CanvasRenderingContext2D,
        point: Point,
        fillColor: string,
        pixelSize: number
    ): void {
        const canvas = ctx.canvas;
        const fillColorRgb = this.hexToRgb(fillColor);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const center = this.pixelCenter(point, pixelSize);

        const index = (center.y * canvas.width + center.x) * 4;
        const seed = {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };

        if(seed.a < 250 || !this.isSameColor(seed, fillColorRgb, 0)) {
            const isTransparentSeed = seed.a < 250;
    
            this.floodFillPixelated(
                ctx,
                data,
                point,
                seed,
                fillColorRgb,
                pixelSize,
                isTransparentSeed
            );
        }
    }
    
    private static floodFillPixelated(
        ctx: CanvasRenderingContext2D,
        data: Uint8ClampedArray,
        start: Point, 
        targetColor: RGBA,
        fillColor: RGBA,
        pixelSize: number,
        targetIsTransparent: boolean
    ): void {
        const canvas = ctx.canvas;

        const maxX = Math.floor(canvas.width / pixelSize) - 1;
        const maxY = Math.floor(canvas.height / pixelSize) - 1;

        const visited = new Set<string>();
        const stack: Point[] = [start];

        const gco = ctx.globalCompositeOperation;

        ctx.fillStyle = `rgb(${fillColor.r}, ${fillColor.g}, ${fillColor.b})`;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        
        const tolerance = 2;

        while(stack.length > 0) {
            const p = stack.pop()!;
            const key = `${p.x},${p.y}`;

            if(!visited.has(key) && (p.x >= 0 && p.x <= maxX && p.y >= 0 && p.y <= maxY)) {
                const center = this.pixelCenter(p, pixelSize);

                const idx = (center.y * canvas.width + center.x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                let isTarget = false;
                if(targetIsTransparent) {
                    isTarget = a < 250;
                } else {
                    isTarget = a >= 250 && this.isSameColor({ r, g, b, a }, targetColor, tolerance);
                }

                if(isTarget) {                    
                    visited.add(key);
                    ctx.fillRect(p.x * pixelSize, p.y * pixelSize, pixelSize, pixelSize);
                    
                    stack.push({ x: p.x + 1, y: p.y });
                    stack.push({ x: p.x - 1, y: p.y });
                    stack.push({ x: p.x, y: p.y + 1 });
                    stack.push({ x: p.x, y: p.y - 1 });
                }
            }
        }

        ctx.globalCompositeOperation = gco;
    }

    private static pixelCenter(p: Point, pixelSize: number): Point {
        const cx = p.x * pixelSize + Math.floor(pixelSize / 2);
        const cy = p.y * pixelSize + Math.floor(pixelSize / 2);
        return { x: cx, y: cy };
    }
    
    private static isSameColor(
        a: RGBA,
        b: RGBA,
        tolerance: number
    ): boolean {
        return (
            Math.abs(a.r - b.r) <= tolerance &&
            Math.abs(a.g - b.g) <= tolerance &&
            Math.abs(a.b - b.b) <= tolerance
        );
    }
    
    private static hexToRgb(hex: string): RGBA {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) ?? ["00", "00", "00"];
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 255
        };
    }
}
