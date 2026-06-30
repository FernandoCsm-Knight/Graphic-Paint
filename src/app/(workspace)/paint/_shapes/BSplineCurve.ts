/**
 * BSplineCurve — B-spline cúbica uniforme com nós clamped
 *
 * ─── MODELO MATEMÁTICO ────────────────────────────────────────────────────────
 *
 * Uma B-spline de grau k com n pontos de controle P₀, …, Pₙ₋₁ é definida por:
 *
 *   C(t) = Σ_{i=0}^{n-1} Nᵢ,ₖ(t) · Pᵢ ,   t ∈ [tₖ, tₙ]
 *
 * onde Nᵢ,ₖ(t) são as funções base de B-spline calculadas pela recursão de
 * Cox–de Boor (1972):
 *
 *   Nᵢ,₀(t) = 1  se tᵢ ≤ t < tᵢ₊₁ (ou = em t = tₙ),  0 caso contrário
 *
 *   Nᵢ,ₖ(t) = ( (t − tᵢ)   / (tᵢ₊ₖ − tᵢ)   ) · Nᵢ,ₖ₋₁(t)
 *            + ( (tᵢ₊ₖ₊₁−t) / (tᵢ₊ₖ₊₁−tᵢ₊₁) ) · Nᵢ₊₁,ₖ₋₁(t)
 *
 * com a convenção 0/0 = 0 para evitar divisão por zero nos nós repetidos.
 *
 * ─── VETOR DE NÓS CLAMPED UNIFORME (grau 3) ──────────────────────────────────
 *
 * Para uma B-spline cúbica (k = 3) com n pontos de controle (n ≥ 4):
 *
 *   T = [0, 0, 0, 0,  1, 2, …, n−4,  n−3, n−3, n−3, n−3]
 *       ↑─────────────↑                   ↑──────────────────↑
 *       4 zeros no início                4 cópias do valor máximo
 *       (nós repetidos → passa pelo P₀ e Pₙ₋₁)
 *
 * Comprimento do vetor: n + 4 nós (= n + k + 1, como esperado).
 * Domínio de avaliação: t ∈ [0, n − 3].
 * Número de segmentos cúbicos: n − 3.
 *
 * A repetição dos nós extremos faz a curva ser "clamped" (interpolante):
 *   C(0) = P₀  e  C(n−3) = Pₙ₋₁.
 *
 * ─── ALGORITMO DE DE BOOR ────────────────────────────────────────────────────
 *
 * Para um t dado, o algoritmo localiza o span [tᵢ, tᵢ₊₁) que o contém e
 * então realiza k triangulações de interpolações lineares ("pirâmide de de Boor"):
 *
 *   Inicializa: dⱼ = P_{i−k+j}   j = 0,…,k
 *   Para r = 1,…,k:
 *     Para j = k,…,r:
 *       α = (t − T_{i−k+j}) / (T_{i+1+j−r} − T_{i−k+j})
 *       dⱼ = (1−α)·dⱼ₋₁ + α·dⱼ
 *   Retorna dₖ
 *
 * Propriedades da B-spline vs. Bézier:
 *   ✔ Controle local: mover Pᵢ afeta apenas os segmentos vizinhos.
 *   ✔ Continuidade C² em todos os nós internos simples.
 *   ✔ Invariância afim: translação/rotação/escala aplicadas nos CPs refletem na curva.
 *
 * ─── REFINAMENTOS DE IMPLEMENTAÇÃO ───────────────────────────────────────────
 *
 * standardDraw():
 *   Amostragem uniforme de De Boor → sequência de lineTo() no Canvas 2D.
 *   N_STEPS = max(200, n × 50) pontos para suavidade visual.
 *
 * pixelatedDraw():
 *   Mesma amostragem em coordenadas de grade →
 *   Bresenham entre pares consecutivos → drawPixel() para cada pixel.
 *   Número de amostras dimensionado pela diagonal da bounding box.
 *
 * ─── REFERÊNCIAS ─────────────────────────────────────────────────────────────
 *   Cox, M.G. (1972). The numerical evaluation of B-splines.
 *     IMA Journal of Applied Mathematics, 10(2), 134–149.
 *   de Boor, C. (1972). On calculating with B-splines.
 *     Journal of Approximation Theory, 6(1), 50–62.
 *   Piegl, L. & Tiller, W. (1997). The NURBS Book (2nd ed.). Springer.
 *     Algorithm A2.1 (FindSpan), A3.1 (CurvePoint), §9.1 (clamped knot vector).
 */

import bresenham from "../_algorithms/BresenhamLine";
import type { Point } from "@/types/geometry";
import { Shape, type BoundingBox, type ResizeOptions, type ShapeOptions } from "./ShapeTypes";

const DEGREE = 3; // cúbica

// ─── Knot vector ─────────────────────────────────────────────────────────────

/**
 * Constrói o vetor de nós clamped uniforme para `n` pontos de controle
 * e grau `k`. Comprimento = n + k + 1.
 *
 * Exemplo (n=5, k=3): [0, 0, 0, 0, 1, 2, 2, 2, 2]
 */
function buildClampedKnots(n: number, k: number = DEGREE): number[] {
    const m = n + k + 1;
    const T = new Array<number>(m);
    for (let i = 0; i <= k; i++) T[i] = 0;
    for (let i = k + 1; i < n; i++) T[i] = i - k;
    const max = n - k;
    for (let i = n; i < m; i++) T[i] = max;
    return T;
}

// ─── De Boor evaluation ──────────────────────────────────────────────────────

/**
 * Localiza o span i tal que T[i] ≤ t < T[i+1].
 * No extremo superior (t = T[n]), retorna o último span não-vazio.
 */
function findKnotSpan(n: number, k: number, t: number, T: number[]): number {
    if (t >= T[n]) {
        let i = n - 1;
        while (i > k && T[i] === T[n]) i--;
        return i;
    }
    let lo = k, hi = n;
    let mid = Math.floor((lo + hi) / 2);
    while (t < T[mid] || t >= T[mid + 1]) {
        if (t < T[mid]) hi = mid;
        else lo = mid;
        mid = Math.floor((lo + hi) / 2);
    }
    return mid;
}

/**
 * Avalia C(t) usando o algoritmo de de Boor (triângulo de interpolação).
 * Requer `span` já calculado por findKnotSpan().
 */
function deBoor(pts: Point[], T: number[], k: number, span: number, t: number): Point {
    const d: Point[] = [];
    for (let j = 0; j <= k; j++) {
        const idx = span - k + j;
        d.push({ x: pts[idx].x, y: pts[idx].y });
    }
    for (let r = 1; r <= k; r++) {
        for (let j = k; j >= r; j--) {
            const i = span - k + j;
            const denom = T[i + k - r + 1] - T[i];
            const alpha = denom === 0 ? 0 : (t - T[i]) / denom;
            d[j].x = (1 - alpha) * d[j - 1].x + alpha * d[j].x;
            d[j].y = (1 - alpha) * d[j - 1].y + alpha * d[j].y;
        }
    }
    return d[k];
}

/**
 * Amostra `steps + 1` pontos uniformes no domínio [T[k], T[n]].
 */
function sampleBSpline(pts: Point[], steps: number): Point[] {
    const n = pts.length;
    const k = DEGREE;
    const T = buildClampedKnots(n, k);
    const tMin = T[k];
    const tMax = T[n];
    const out: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = tMin + (i / steps) * (tMax - tMin);
        const span = findKnotSpan(n, k, t, T);
        out.push(deBoor(pts, T, k, span, t));
    }
    return out;
}

// ─── Shape class ─────────────────────────────────────────────────────────────

export default class BSplineCurve extends Shape {
    readonly kind = 'bspline' as const;
    /** Pontos de controle em coordenadas do documento (mínimo: 4). */
    points: Point[];

    constructor(points: Point[], opts: ShapeOptions) {
        super(opts);
        this.points = points.map(p => ({ ...p }));
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const pts = this.points;
        if (pts.length < 4) return;

        const steps = Math.max(200, pts.length * 50);
        const samples = sampleBSpline(pts, steps);

        ctx.beginPath();
        ctx.moveTo(samples[0].x, samples[0].y);
        for (let i = 1; i < samples.length; i++) {
            ctx.lineTo(samples[i].x, samples[i].y);
        }
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const pts = this.points;
        if (pts.length < 4) return;

        ctx.fillStyle = this.strokeStyle;
        const drawPixel = this.drawPixel.bind(this);

        // pts já estão em coordenadas de grade (convertidas antes de chegar aqui).
        // diag em grid-units → sem divisão por pixelSize.
        const bb = this.getBoundingBox();
        const diag = Math.ceil(Math.hypot(bb.width, bb.height));
        const steps = Math.max(diag * 3, pts.length * 20, 50);

        const samples = sampleBSpline(pts, steps);

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
