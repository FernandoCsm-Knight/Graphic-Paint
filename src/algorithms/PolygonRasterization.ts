import type { Point } from "../types/Graphics";
import bresenham from "./BresenhamLine";

export const rasterizePixelatedPolygon = (
    points: Point[],
    drawPixel: (point: Point, ctx: CanvasRenderingContext2D) => void,
    ctx: CanvasRenderingContext2D
): void => {
    for(let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = points[(i + 1) % points.length];
        
        bresenham(start, end, drawPixel, ctx);
    }
};

export const rasterizePolygon = (
    points: Point[],
    lineWidth: number,
    strokeStyle: string,
    ctx: CanvasRenderingContext2D
): void => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for(let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
}

/**
 * Scanline fill algorithm para preenchimento de polígonos pixelados
 * Implementação baseada no algoritmo de preenchimento por varredura do livro "Computer Graphics"
 */
export const fillPolygon = (
    points: Point[],
    drawPixel: (point: Point, ctx: CanvasRenderingContext2D) => void,
    ctx: CanvasRenderingContext2D
): void => {
    if (points.length < 3) return;

    // Encontra os limites do polígono
    let minY = Math.floor(points[0].y);
    let maxY = Math.floor(points[0].y);
    
    for (const point of points) {
        minY = Math.min(minY, Math.floor(point.y));
        maxY = Math.max(maxY, Math.floor(point.y));
    }

    // Para cada linha de varredura
    for (let y = minY; y <= maxY; y++) {
        const intersections: number[] = [];

        // Encontra intersecções com as arestas
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            // Verifica se a linha y intersecta com a aresta
            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                // Calcula a intersecção x usando interpolação linear
                const x = p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
                intersections.push(Math.floor(x));
            }
        }

        // Ordena as intersecções
        intersections.sort((a, b) => a - b);

        // Remove duplicatas
        const uniqueIntersections = [...new Set(intersections)];

        // Preenche entre pares de intersecções
        for (let i = 0; i < uniqueIntersections.length; i += 2) {
            if (i + 1 < uniqueIntersections.length) {
                for (let x = uniqueIntersections[i]; x <= uniqueIntersections[i + 1]; x++) {
                    drawPixel({ x, y }, ctx);
                }
            }
        }
    }
};

/**
 * Gera pontos para polígonos regulares
 * @param center Centro do polígono
 * @param radius Raio do polígono
 * @param sides Número de lados
 * @param rotation Rotação em radianos
 */
export const generateRegularPolygon = (
    center: Point,
    radius: number,
    sides: number,
    rotation: number = 0
): Point[] => {
    const points: Point[] = [];
    const angleStep = (2 * Math.PI) / sides;

    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep + rotation;
        points.push({
            x: Math.round(center.x + radius * Math.cos(angle)),
            y: Math.round(center.y + radius * Math.sin(angle))
        });
    }

    return points;
};
