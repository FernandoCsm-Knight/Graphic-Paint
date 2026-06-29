/**
 * BezierCurve — curva de Bézier polinomial de grau arbitrário
 *
 * ─── MODELO MATEMÁTICO ────────────────────────────────────────────────────────
 *
 * Uma curva de Bézier de grau n é definida por (n+1) pontos de controle
 * P₀, P₁, …, Pₙ e um parâmetro t ∈ [0, 1]:
 *
 *   B(t) = Σ_{i=0}^{n} C(n,i) · (1-t)^(n-i) · t^i · Pᵢ
 *
 * onde C(n,i) = n! / (i!(n-i)!) é o coeficiente binomial (polinômio de Bernstein).
 *
 * ─── ALGORITMO DE DE CASTELJAU ────────────────────────────────────────────────
 *
 * Em vez de avaliar diretamente a forma de Bernstein (numericamente instável para
 * graus altos), usamos o algoritmo de De Casteljau (1959), que computa B(t) por
 * interpolações lineares sucessivas:
 *
 *   Pᵢ⁽⁰⁾ = Pᵢ                                (inicializa com os pontos de controle)
 *   Pᵢ⁽ʳ⁾ = (1-t)·Pᵢ⁽ʳ⁻¹⁾ + t·Pᵢ₊₁⁽ʳ⁻¹⁾      (r = 1,…,n  ;  i = 0,…,n-r)
 *   B(t)  = P₀⁽ⁿ⁾                              (resultado final)
 *
 * Propriedades garantidas pelo algoritmo:
 *   - A curva parte de P₀ (t=0) e termina em Pₙ (t=1).
 *   - A curva está contida no invólucro convexo dos pontos de controle.
 *   - Modificar um ponto afeta toda a curva (controle global).
 *
 * Complexidade: O(n²) por avaliação de ponto; para graus práticos (n ≤ 20) e
 * o número de amostras usado aqui (≤ 400), o custo é negligenciável.
 *
 * ─── REFINAMENTOS DE IMPLEMENTAÇÃO ───────────────────────────────────────────
 *
 * standardDraw():
 *   - grau 1 (2 pts):  lineTo trivial.
 *   - grau 2 (3 pts):  quadraticCurveTo() nativa do Canvas 2D — zero amostras.
 *   - grau 3 (4 pts):  bezierCurveTo() nativa do Canvas 2D — zero amostras.
 *   - grau ≥ 4:         De Casteljau com N_SAMPLES amostras conectadas por lineTo.
 *
 * pixelatedDraw():
 *   Amostras De Casteljau → vetor de pontos em coordenadas de grade →
 *   Bresenham entre cada par consecutivo de amostras → drawPixel() por vértice.
 *   O número de amostras é dimensionado pela diagonal da bounding box para
 *   garantir cobertura sem falhas.
 *
 * ─── REFERÊNCIAS ─────────────────────────────────────────────────────────────
 *   de Casteljau, P. (1959). Outillages methodes calcul. André Citroën Automobiles SA.
 *   Farin, G. (2002). Curves and Surfaces for CAGD (5th ed.). Morgan Kaufmann.
 *     §5 – Bézier curves; §6 – Geometric continuity.
 */

import bresenham from "../_algorithms/BresenhamLine";
import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";
import { map } from "../_types/Graphics";

// ─── De Casteljau evaluation ─────────────────────────────────────────────────

/**
 * Avalia um ponto em t ∈ [0,1] sobre a curva de Bézier definida por `pts`
 * usando o algoritmo de De Casteljau.
 *
 * A operação é feita em um buffer temporário para não modificar os pontos
 * de controle originais.
 */
function deCasteljau(pts: Point[], t: Point['x']): Point {
    const d: Point[] = pts.map(p => ({ x: p.x, y: p.y }));
    const n = d.length;
    for (let r = 1; r < n; r++) {
        for (let i = 0; i < n - r; i++) {
            d[i].x = (1 - t) * d[i].x + t * d[i + 1].x;
            d[i].y = (1 - t) * d[i].y + t * d[i + 1].y;
        }
    }
    return d[0];
}

/**
 * Gera um array de `steps + 1` pontos amostrados uniformemente em t ∈ [0,1].
 * O resultado inclui t=0 e t=1 (pontos inicial e final).
 */
function sampleBezier(pts: Point[], steps: number): Point[] {
    const out: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        out.push(deCasteljau(pts, i / steps));
    }
    return out;
}

// ─── Shape class ─────────────────────────────────────────────────────────────

export default class BezierCurve extends Shape {
    readonly kind = 'bezier' as const;
    /** Pontos de controle em coordenadas do documento. */
    points: Point[];

    constructor(points: Point[], opts: ShapeOptions) {
        super(opts);
        this.points = points.map(p => ({ ...p }));
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const pts = this.points;
        if (pts.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (pts.length === 2) {
            // grau 1: segmento de reta
            ctx.lineTo(pts[1].x, pts[1].y);
        } else if (pts.length === 3) {
            // grau 2: cúrva quadrática — ponto de controle P₁ é o CP
            ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        } else if (pts.length === 4) {
            // grau 3: cúrva cúbica — P₁ e P₂ são os CPs
            ctx.bezierCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
        } else {
            // grau ≥ 4: De Casteljau com amostragem densa
            const steps = Math.max(100, pts.length * 30);
            const samples = sampleBezier(pts, steps);
            for (let i = 1; i < samples.length; i++) {
                ctx.lineTo(samples[i].x, samples[i].y);
            }
        }

        ctx.stroke();
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const pts = this.points;
        if (pts.length < 2) return;

        ctx.fillStyle = this.strokeStyle;
        const drawPixel = this.drawPixel.bind(this);

        // Dimensiona o número de amostras pela diagonal da bbox para evitar
        // lacunas ao rasterizar em coordenadas de grade (pixelSize unidades).
        const bb = this.getBoundingBox();
        const diag = Math.ceil(Math.hypot(bb.width, bb.height) / this.pixelSize);
        const steps = Math.max(diag * 3, pts.length * 20, 50);

        // Converte para coordenadas de grade antes de amostrar
        const gridPts = pts.map(p => map(p, this.pixelSize));
        const samples = sampleBezier(gridPts, steps);

        // Bresenham entre pares consecutivos de amostras
        for (let i = 0; i < samples.length - 1; i++) {
            const a: Point = { x: Math.round(samples[i].x),     y: Math.round(samples[i].y) };
            const b: Point = { x: Math.round(samples[i + 1].x), y: Math.round(samples[i + 1].y) };
            bresenham(a, b, drawPixel, ctx);
        }
    }

    // ── Geometry ─────────────────────────────────────────────────────────────

    getBoundingBox(): BoundingBox {
        if (this.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        const xs = this.points.map(p => p.x);
        const ys = this.points.map(p => p.y);
        const x = Math.min(...xs), y = Math.min(...ys);
        return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }

    // ── Transforms ───────────────────────────────────────────────────────────

    moveBy(dx: number, dy: number): void {
        this.translatePointCollection(this.points, dx, dy);
    }

    rotateBy(angle: number, pivot: Point): void {
        this.rotatePoints(this.points, this._rotateOriginalPoints, angle, pivot);
    }

    resizeToBoundingBox(bounds: BoundingBox, options: ResizeOptions = {}): boolean {
        return this.resizePointCollection(this.points, bounds, options);
    }
}
