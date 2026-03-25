import type { Point, RGBA } from "@/types/geometry";
import { isSameColor, pixelCenter } from "../_types/Graphics";

export default class ScanLineFill {
    /**
     * Ponto de entrada do preenchimento scanline.
     * Lê o pixel semente em `point`, determina a cor alvo e delega para
     * `standard` (pixels individuais) ou `pixelated` (células de grid) conforme o modo.
     * Retorna sem fazer nada se a semente já tiver a cor de preenchimento.
     */
    static fill(
        ctx: CanvasRenderingContext2D,
        point: Point,
        fillColor: string,
        pixelSize: number,
        isEraser: boolean,
        pixelated: boolean
    ): void {
        const canvas = ctx.canvas;
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;

        const fillRGBA = isEraser ? { r: 0, g: 0, b: 0, a: 0 } : this.hexToRgb(fillColor);

        const center: Point = pixelated
            ? pixelCenter(point, pixelSize)
            : {
                x: Math.max(0, Math.min(Math.floor(point.x), canvas.width - 1)),
                y: Math.max(0, Math.min(Math.floor(point.y), canvas.height - 1))
            };

        const idx = (center.y * canvas.width + center.x) * 4;
        const seed: RGBA = { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };

        const isTransparentSeed = seed.a < 250;
        if (!isTransparentSeed && !isEraser && isSameColor(seed, fillRGBA, 0)) return;

        if (pixelated) {
            this.pixelated(ctx, image, point, seed, fillRGBA, pixelSize, isTransparentSeed, isEraser);
        } else {
            this.standard(ctx, image, center, seed, fillRGBA, isTransparentSeed, isEraser);
        }
    }

    /**
     * Preenchimento scanline no modo padrão, operando em pixels individuais.
     * A partir de `start`, expande horizontalmente para encontrar o segmento da linha,
     * pinta todos os pixels do intervalo e empilha os segmentos adjacentes (y-1 e y+1)
     * que contêm pixels correspondentes à cor alvo.
     */
    private static standard(
        ctx: CanvasRenderingContext2D,
        image: ImageData,
        start: Point,
        targetColor: RGBA,
        fillColor: RGBA,
        targetIsTransparent: boolean,
        isEraser: boolean
    ) {
        const { width: w, height: h, data } = image;
        const tolerance = 2;

        const colorMatch = (i: number): boolean => {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (targetIsTransparent) return a < 250;
            if (a < 250) return false;
            return isSameColor({ r, g, b, a }, targetColor, tolerance);
        };

        const setColor = (i: number) => {
            data[i]     = isEraser ? 0 : fillColor.r;
            data[i + 1] = isEraser ? 0 : fillColor.g;
            data[i + 2] = isEraser ? 0 : fillColor.b;
            data[i + 3] = isEraser ? 0 : 255;
        };

        type Segment = { xL: number; xR: number; y: number };
        const stack: Segment[] = [];

        const seedX = start.x | 0;
        const seedY = start.y | 0;
        if (seedX < 0 || seedX >= w || seedY < 0 || seedY >= h) return;
        const seedIdx = (seedY * w + seedX) * 4;
        if (!colorMatch(seedIdx)) return;

        const scanAndFill = (xStart: number, y: number): Segment | null => {
            let xL = xStart;
            let i = (y * w + xL) * 4;
            while (xL >= 0 && colorMatch(i)) { xL--; i -= 4; }
            xL++; i += 4;

            let xR = xStart;
            i = (y * w + xR) * 4;
            while (xR < w && colorMatch(i)) { setColor(i); xR++; i += 4; }
            xR--;

            for (let x = xL; x <= xR; x++) setColor((y * w + x) * 4);
            return xL <= xR ? { xL, xR, y } : null;
        };

        const firstSeg = scanAndFill(seedX, seedY);
        if (firstSeg) stack.push(firstSeg);

        while (stack.length) {
            const { xL, xR, y } = stack.pop()!;
            for (const ny of [y - 1, y + 1]) {
                if (ny < 0 || ny >= h) continue;
                let x = xL;
                while (x <= xR) {
                    let i2 = (ny * w + x) * 4;
                    while (x <= xR && !colorMatch(i2)) { x++; i2 += 4; }
                    if (x > xR) break;
                    const seg = scanAndFill(x, ny);
                    if (seg) stack.push(seg);
                    x = (seg ? seg.xR : x) + 1;
                }
            }
        }

        ctx.putImageData(image, 0, 0);
    }

    /**
     * Preenchimento scanline no modo pixelado, operando em células de grid de tamanho `pixelSize`.
     * Funciona da mesma forma que `standard`, mas cada unidade tratada é uma célula inteira
     * do grid em vez de um pixel individual — a cor de cada célula é amostrada pelo seu centro.
     */
    private static pixelated(
        ctx: CanvasRenderingContext2D,
        image: ImageData,
        start: Point,
        targetColor: RGBA,
        fillColor: RGBA,
        pixelSize: number,
        targetIsTransparent: boolean,
        isEraser: boolean
    ) {
        const { width: w, height: h, data } = image;
        const gridW = Math.floor(w / pixelSize);
        const gridH = Math.floor(h / pixelSize);
        const tolerance = 2;

        const centerOfCell = (gx: number, gy: number) => {
            return {
                x: gx * pixelSize + Math.floor(pixelSize / 2),
                y: gy * pixelSize + Math.floor(pixelSize / 2)
            };
        };

        const cellMatches = (gx: number, gy: number): boolean => {
            const c = centerOfCell(gx, gy);
            const i = (c.y * w + c.x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (targetIsTransparent) return a < 250;
            if (a < 250) return false;
            return isSameColor({ r, g, b, a }, targetColor, tolerance);
        };

        const fillCell = (gx: number, gy: number) => {
            for (let yy = gy * pixelSize; yy < (gy + 1) * pixelSize; yy++) {
                let i = (yy * w + gx * pixelSize) * 4;
                for (let xx = 0; xx < pixelSize; xx++, i += 4) {
                    data[i]     = isEraser ? 0 : fillColor.r;
                    data[i + 1] = isEraser ? 0 : fillColor.g;
                    data[i + 2] = isEraser ? 0 : fillColor.b;
                    data[i + 3] = isEraser ? 0 : 255;
                }
            }
        };

        type Segment = { xL: number; xR: number; y: number };
        const stack: Segment[] = [];

        const seedGrid = {
            x: Math.max(0, Math.min(Math.floor(start.x), gridW - 1)),
            y: Math.max(0, Math.min(Math.floor(start.y), gridH - 1)),
        };
        if (!cellMatches(seedGrid.x, seedGrid.y)) return;

        const scanAndFillCells = (gxStart: number, gy: number): Segment | null => {
            let xL = gxStart;
            while (xL >= 0 && cellMatches(xL, gy)) xL--;
            xL++;
            let xR = gxStart;
            while (xR < gridW && cellMatches(xR, gy)) xR++;
            xR--;

            for (let gx = xL; gx <= xR; gx++) fillCell(gx, gy);
            return xL <= xR ? { xL, xR, y: gy } : null;
        };

        const firstSeg = scanAndFillCells(seedGrid.x, seedGrid.y);
        if (firstSeg) stack.push(firstSeg);

        while (stack.length) {
            const { xL, xR, y } = stack.pop()!;
            for (const ny of [y - 1, y + 1]) {
                if (ny < 0 || ny >= gridH) continue;
                let gx = xL;
                while (gx <= xR) {
                    if (!cellMatches(gx, ny)) { gx++; continue; }
                    const seg = scanAndFillCells(gx, ny);
                    if (seg) stack.push(seg);
                    gx = (seg ? seg.xR : gx) + 1;
                }
            }
        }

        ctx.putImageData(image, 0, 0);
    }

    /**
     * Converte uma string de cor hexadecimal (`#RRGGBB`) para um objeto RGBA com alpha 255.
     */
    private static hexToRgb(hex: string): RGBA {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) ?? ["00", "00", "00"];
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 255
        };
    }
};