import { isSameColor, pixelCenter, type Point, type RGBA } from "../types/Graphics";

export default class FloodFill {
    static fill(
        ctx: CanvasRenderingContext2D,
        point: Point,
        fillColor: string,
        pixelSize: number,
        isEraser: boolean,
        pixelated: boolean
    ): void {
        const canvas = ctx.canvas;
        const fillColorRgb = isEraser ? { r: 0, g: 0, b: 0, a: 0 } : this.hexToRgb(fillColor);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        let center: Point;
        if (pixelated) {
            center = pixelCenter(point, pixelSize);
        } else {
            center = {
                x: Math.max(0, Math.min(Math.floor(point.x), canvas.width - 1)),
                y: Math.max(0, Math.min(Math.floor(point.y), canvas.height - 1))
            };
        }

        const index = (center.y * canvas.width + center.x) * 4;
        const seed = {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };

        const isTransparentSeed = seed.a < 250;
        if(isTransparentSeed || !isSameColor(seed, fillColorRgb, 0)) {
            if(pixelated) {
                this.floodFillPixelated(
                    ctx,
                    data,
                    point,
                    seed,
                    fillColorRgb,
                    pixelSize,
                    isTransparentSeed,
                    isEraser
                );
            } else {
                this.floodFillStandard(
                    ctx,
                    data,
                    center,
                    seed,
                    fillColorRgb,
                    isTransparentSeed,
                    isEraser
                )
            }
        }
    }

    private static floodFillStandard(
        ctx: CanvasRenderingContext2D,
        data: Uint8ClampedArray,
        start: Point,
        targetColor: RGBA,
        fillColor: RGBA,
        targetIsTransparent: boolean,
        isEraser: boolean
    ): void {
        const canvas = ctx.canvas;

        const maxX = canvas.width - 1;
        const maxY = canvas.height - 1;

        const visited = new Uint8Array(canvas.width * canvas.height);
        const stack: Point[] = [start];

        const gco = ctx.globalCompositeOperation;

        ctx.fillStyle = `rgb(${fillColor.r}, ${fillColor.g}, ${fillColor.b})`;
        ctx.globalCompositeOperation = isEraser ? 'destination-out' :'source-over';
        ctx.globalAlpha = 1;

        const tolerance = 2;

        while(stack.length > 0) {
            const p = stack.pop()!;
            if(p.x >= 0 && p.x <= maxX && p.y >= 0 && p.y <= maxY) {
                const index = (p.y * canvas.width + p.x) * 4;

                if(visited[index / 4]) continue;

                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                let isTarget = false;
                if(targetIsTransparent) {
                    isTarget = a < 250;
                } else {
                    isTarget = a >= 250 && isSameColor({ r, g, b, a }, targetColor, tolerance);
                }

                if(isTarget) {
                    visited[index / 4] = 1;

                    ctx.fillRect(p.x, p.y, 1, 1);

                    stack.push({ x: p.x + 1, y: p.y });
                    stack.push({ x: p.x - 1, y: p.y });
                    stack.push({ x: p.x, y: p.y + 1 });
                    stack.push({ x: p.x, y: p.y - 1 });
                    stack.push({ x: p.x + 1, y: p.y + 1 });
                    stack.push({ x: p.x - 1, y: p.y - 1 });
                    stack.push({ x: p.x + 1, y: p.y - 1 });
                    stack.push({ x: p.x - 1, y: p.y + 1 });
                }
            }
        }

        ctx.globalCompositeOperation = gco;
    }
    
    private static floodFillPixelated(
        ctx: CanvasRenderingContext2D,
        data: Uint8ClampedArray,
        start: Point, 
        targetColor: RGBA,
        fillColor: RGBA,
        pixelSize: number,
        targetIsTransparent: boolean,
        isEraser: boolean
    ): void {
        const canvas = ctx.canvas;

        const maxX = Math.floor(canvas.width / pixelSize) - 1;
        const maxY = Math.floor(canvas.height / pixelSize) - 1;

        const gridW = maxX + 1;
        const gridH = maxY + 1;
        const visited = new Uint8Array(gridW * gridH); 
        const stack: Point[] = [start];

        const gco = ctx.globalCompositeOperation;

        ctx.fillStyle = `rgb(${fillColor.r}, ${fillColor.g}, ${fillColor.b})`;
        ctx.globalCompositeOperation = isEraser ? 'destination-out' :'source-over';
        ctx.globalAlpha = 1;
        
        const tolerance = 2;

        while(stack.length > 0) {
            const p = stack.pop()!;
            if(p.x >= 0 && p.x <= maxX && p.y >= 0 && p.y <= maxY) {
                const vIdx = p.y * gridW + p.x;
                if(visited[vIdx]) continue;
                const center = pixelCenter(p, pixelSize);

                const idx = (center.y * canvas.width + center.x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                let isTarget = false;
                if(targetIsTransparent) {
                    isTarget = a < 250;
                } else {
                    isTarget = a >= 250 && isSameColor({ r, g, b, a }, targetColor, tolerance);
                }

                if(isTarget) {
                    visited[vIdx] = 1;
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
