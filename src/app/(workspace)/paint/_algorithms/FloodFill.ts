import { hexToRgb, type Point, type RGBA } from "@/types/geometry";
import { isSameColor, pixelCenter } from "../_types/Graphics";

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
        const fillColorRgb = isEraser ? { r: 0, g: 0, b: 0, a: 0 } : hexToRgb(fillColor);

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;

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
                this.pixelated(
                    ctx,
                    image,
                    point,
                    seed,
                    fillColorRgb,
                    pixelSize,
                    isTransparentSeed,
                    isEraser
                );
            } else {
                this.standard(
                    ctx,
                    image,
                    center,
                    seed,
                    fillColorRgb,
                    isTransparentSeed,
                    isEraser
                );
            }
        }
    }

    private static standard(
        ctx: CanvasRenderingContext2D,
        image: ImageData,
        start: Point,
        targetColor: RGBA,
        fillColor: RGBA,
        targetIsTransparent: boolean,
        isEraser: boolean
    ): void {
        const { width, height, data } = image;
        const maxX = width - 1;
        const maxY = height - 1;

        const visited = new Uint8Array(width * height);
        const stack: Point[] = [start];
        const tolerance = 2;

        while(stack.length > 0) {
            const p = stack.pop()!;
            if(p.x < 0 || p.x > maxX || p.y < 0 || p.y > maxY) continue;

            const vIdx = p.y * width + p.x;
            if(visited[vIdx]) continue;

            const idx = vIdx * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            let isTarget: boolean;
            if(targetIsTransparent) {
                isTarget = a < 250;
            } else {
                isTarget = a >= 250 && isSameColor({ r, g, b, a }, targetColor, tolerance);
            }

            if(isTarget) {
                visited[vIdx] = 1;

                if(isEraser) {
                    data[idx] = 0;
                    data[idx + 1] = 0;
                    data[idx + 2] = 0;
                    data[idx + 3] = 0;
                } else {
                    data[idx] = fillColor.r;
                    data[idx + 1] = fillColor.g;
                    data[idx + 2] = fillColor.b;
                    data[idx + 3] = 255;
                }

                stack.push({ x: p.x + 1, y: p.y });
                stack.push({ x: p.x - 1, y: p.y });
                stack.push({ x: p.x, y: p.y + 1 });
                stack.push({ x: p.x, y: p.y - 1 });
            }
        }

        ctx.putImageData(image, 0, 0);
    }

    private static pixelated(
        ctx: CanvasRenderingContext2D,
        image: ImageData,
        start: Point,
        targetColor: RGBA,
        fillColor: RGBA,
        pixelSize: number,
        targetIsTransparent: boolean,
        isEraser: boolean
    ): void {
        const { width, height, data } = image;
        const maxX = Math.floor(width / pixelSize) - 1;
        const maxY = Math.floor(height / pixelSize) - 1;

        const gridW = maxX + 1;
        const visited = new Uint8Array(gridW * (maxY + 1));
        const stack: Point[] = [start];
        const tolerance = 2;

        while(stack.length > 0) {
            const p = stack.pop()!;
            if(p.x < 0 || p.x > maxX || p.y < 0 || p.y > maxY) continue;

            const vIdx = p.y * gridW + p.x;
            if(visited[vIdx]) continue;

            const center = pixelCenter(p, pixelSize);
            const idx = (center.y * width + center.x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            let isTarget: boolean;
            if(targetIsTransparent) {
                isTarget = a < 250;
            } else {
                isTarget = a >= 250 && isSameColor({ r, g, b, a }, targetColor, tolerance);
            }

            if(isTarget) {
                visited[vIdx] = 1;

                for(let yy = p.y * pixelSize; yy < (p.y + 1) * pixelSize && yy < height; yy++) {
                    let i = (yy * width + p.x * pixelSize) * 4;
                    for(let xx = 0; xx < pixelSize && (p.x * pixelSize + xx) < width; xx++, i += 4) {
                        if(isEraser) {
                            data[i] = 0;
                            data[i + 1] = 0;
                            data[i + 2] = 0;
                            data[i + 3] = 0;
                        } else {
                            data[i] = fillColor.r;
                            data[i + 1] = fillColor.g;
                            data[i + 2] = fillColor.b;
                            data[i + 3] = 255;
                        }
                    }
                }

                stack.push({ x: p.x + 1, y: p.y });
                stack.push({ x: p.x - 1, y: p.y });
                stack.push({ x: p.x, y: p.y + 1 });
                stack.push({ x: p.x, y: p.y - 1 });
            }
        }

        ctx.putImageData(image, 0, 0);
    }
}
