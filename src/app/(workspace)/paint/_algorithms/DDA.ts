import type { Point } from "@/types/geometry";

/**
 * Algoritmo DDA (Digital Differential Analyzer) para rasterização de segmentos de reta.
 * Divide o segmento em `steps` incrementos iguais usando ponto flutuante e arredonda
 * cada posição ao pixel mais próximo, invocando `callback` a cada passo.
 * Mais simples que Bresenham, porém usa divisão e arredondamento por etapa.
 */
const dda = (
    start: Point, 
    end: Point, 
    callback: (point: Point, ctx: CanvasRenderingContext2D) => void, 
    ctx: CanvasRenderingContext2D
): void => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    const xIncrement = dx / steps;
    const yIncrement = dy / steps;

    let x = start.x;
    let y = start.y;

    callback({ x, y }, ctx);
    for(let i = 0; i < steps; i++) {
        x += xIncrement;
        y += yIncrement;
        callback({ x: Math.round(x), y: Math.round(y) }, ctx);
    }
};

export default dda;