/**
 * useCurveDrawing — hook de interação multi-clique para curvas paramétricas
 *
 * Gerencia o fluxo de entrada de pontos de controle para curvas de Bézier e
 * B-spline. O comportamento é análogo ao usePolygonDrawing, mas com lógica de
 * preview especializada: exibe o polígono de controle (traçado tracejado) e a
 * curva resultante simultaneamente durante a edição.
 *
 * Fluxo de interação:
 *   1. Clique simples → adiciona ponto de controle.
 *   2. Clique duplo   → finaliza a curva (commit para pending-placement).
 *   3. Enter          → finaliza a curva.
 *   4. Escape         → cancela e descarta todos os pontos.
 *   5. Troca de tool  → cancela automaticamente.
 *
 * Mínimos de pontos de controle:
 *   Bézier  : 3 (quadrática) — com 2 pontos emite apenas um segmento.
 *   B-spline: 4 (cúbica clamped) — abaixo disso não há curva válida.
 */

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Point } from "@/types/geometry";
import type { Geometric } from "../_types/Graphics";
import type { Shape } from "../_shapes/ShapeTypes";
import type { LineAlgorithm } from "../_context/SettingsContext";
import BezierCurve from "../_shapes/BezierCurve";
import BSplineCurve from "../_shapes/BSplineCurve";
import { toPixels } from "../_types/Graphics";
import bresenham from "../_algorithms/BresenhamLine";
import dda from "../_algorithms/DDA";

const BSPLINE_MIN_POINTS = 4;
const BEZIER_MIN_POINTS = 3;

type UseCurveDrawingInput = {
    contextRef: RefObject<CanvasRenderingContext2D | null>;
    renderViewport: () => void;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    enterPending: (shape: Shape) => void;
    currentColorRef: RefObject<string>;
    thicknessRef: RefObject<number>;
    pixelated: boolean;
    pixelSize: number;
    lineAlgorithm: LineAlgorithm;
    selectedShape: Geometric;
};

const useCurveDrawing = ({
    contextRef,
    renderViewport,
    redrawFromScene,
    enterPending,
    currentColorRef,
    thicknessRef,
    pixelated,
    pixelSize,
    lineAlgorithm,
    selectedShape,
}: UseCurveDrawingInput) => {
    const points = useRef<Point[]>([]);
    const cursor = useRef<Point | null>(null);
    const lastClickTime = useRef<number>(0);

    const isCurveShape = selectedShape === 'bezier' || selectedShape === 'bspline';

    // ── Preview ───────────────────────────────────────────────────────────────

    const drawPreview = useCallback((
        ctx: CanvasRenderingContext2D,
        pts: Point[],
        cur: Point | null,
    ) => {
        if (pts.length === 0) return;

        const color = currentColorRef.current;
        const lw = Math.max(1, thicknessRef.current);
        const algorithm = lineAlgorithm === 'dda' ? dda : bresenham;

        // Pontos para exibir (inclui cursor como ponto temporário)
        const previewPts = cur ? [...pts, cur] : pts;

        if (pixelated) {
            // ── Modo pixelado ──────────────────────────────────────────────
            const drawBlock = (p: Point, _ctx: CanvasRenderingContext2D) => {
                const hw = Math.floor(lw / 2);
                const s = (lw % 2 === 0) ? -hw + 1 : -hw;
                for (let ox = s; ox <= hw; ox++) {
                    for (let oy = s; oy <= hw; oy++) {
                        const { x: px, y: py } = toPixels({ x: p.x + ox, y: p.y + oy }, pixelSize);
                        _ctx.fillRect(px, py, pixelSize, pixelSize);
                    }
                }
            };

            // Polígono de controle (tracejado sólido em modo pixel)
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.35;
            if (previewPts.length >= 2) {
                for (let i = 0; i < previewPts.length - 1; i++) {
                    algorithm(previewPts[i], previewPts[i + 1], drawBlock, ctx);
                }
            }
            ctx.globalAlpha = 1;

            // Marcadores nos pontos de controle já confirmados
            for (const pt of pts) {
                const { x: px, y: py } = toPixels(pt, pixelSize);
                ctx.fillStyle = color;
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }

            // Curva propriamente dita (se houver pontos suficientes)
            const minPts = selectedShape === 'bspline' ? BSPLINE_MIN_POINTS : BEZIER_MIN_POINTS;
            if (pts.length >= minPts) {
                ctx.fillStyle = color;
                const opts = { strokeStyle: color, lineWidth: lw, pixelated: true, pixelSize };
                const curve = selectedShape === 'bezier'
                    ? new BezierCurve(pts, opts)
                    : new BSplineCurve(pts, opts);
                curve.pixelatedDraw(ctx);
            }
        } else {
            // ── Modo vetorial ──────────────────────────────────────────────
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, lw * 0.6);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Polígono de controle tracejado
            if (previewPts.length >= 2) {
                ctx.setLineDash([5, 5]);
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.moveTo(previewPts[0].x, previewPts[0].y);
                for (let i = 1; i < previewPts.length; i++) {
                    ctx.lineTo(previewPts[i].x, previewPts[i].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }

            // Marcadores nos pontos de controle confirmados
            ctx.fillStyle = color;
            for (const pt of pts) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(3, lw + 1), 0, Math.PI * 2);
                ctx.fill();
            }

            // Marcador do cursor (anel vazio)
            if (cur) {
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(cur.x, cur.y, Math.max(3, lw + 1), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Curva propriamente dita (se houver pontos suficientes)
            const minPts = selectedShape === 'bspline' ? BSPLINE_MIN_POINTS : BEZIER_MIN_POINTS;
            if (pts.length >= minPts) {
                ctx.lineWidth = lw;
                const opts = { strokeStyle: color, lineWidth: lw, pixelated: false, pixelSize };
                const curve = selectedShape === 'bezier'
                    ? new BezierCurve(pts, opts)
                    : new BSplineCurve(pts, opts);
                curve.standardDraw(ctx);
            }

            ctx.restore();
        }
    }, [currentColorRef, thicknessRef, pixelated, pixelSize, lineAlgorithm, selectedShape]);

    // ── Finalize ──────────────────────────────────────────────────────────────

    const finalize = useCallback(() => {
        const pts = points.current;
        const ctx = contextRef.current;

        points.current = [];
        cursor.current = null;

        if (!ctx) return;
        redrawFromScene(ctx);

        const minPts = selectedShape === 'bspline' ? BSPLINE_MIN_POINTS : BEZIER_MIN_POINTS;
        if (pts.length >= minPts) {
            const opts = {
                strokeStyle: currentColorRef.current,
                lineWidth: thicknessRef.current,
                pixelated,
                pixelSize,
                lineAlgorithm,
            };
            const curve = selectedShape === 'bezier'
                ? new BezierCurve([...pts], opts)
                : new BSplineCurve([...pts], opts);
            curve.draw(ctx);
            enterPending(curve);
        } else {
            renderViewport();
        }
    }, [contextRef, redrawFromScene, currentColorRef, thicknessRef, pixelated, pixelSize, lineAlgorithm, selectedShape, enterPending, renderViewport]);

    // ── Cancel ────────────────────────────────────────────────────────────────

    const cancel = useCallback(() => {
        const ctx = contextRef.current;
        points.current = [];
        cursor.current = null;
        if (ctx) {
            redrawFromScene(ctx);
            renderViewport();
        }
    }, [contextRef, redrawFromScene, renderViewport]);

    // ── Cancel ao trocar de ferramenta ────────────────────────────────────────

    useEffect(() => {
        if (!isCurveShape && points.current.length > 0) cancel();
    }, [isCurveShape, cancel]);

    // ── Atalhos de teclado ────────────────────────────────────────────────────

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!isCurveShape || points.current.length === 0) return;
            if (e.key === 'Enter') { e.preventDefault(); finalize(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isCurveShape, finalize, cancel]);

    // ── Handlers expostos para useDrawingHandlers ─────────────────────────────

    const onPointerDown = useCallback((mappedPoint: Point) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        const now = Date.now();
        const isDoubleClick = now - lastClickTime.current < 300;
        lastClickTime.current = now;

        points.current.push(mappedPoint);

        if (isDoubleClick && points.current.length >= 2) {
            // Remove o ponto duplicado adicionado pelo segundo clique
            points.current.pop();
            finalize();
            return;
        }

        redrawFromScene(ctx);
        drawPreview(ctx, points.current, cursor.current);
        renderViewport();
    }, [contextRef, finalize, redrawFromScene, drawPreview, renderViewport]);

    const onPointerMove = useCallback((mappedPoint: Point) => {
        const ctx = contextRef.current;
        if (!ctx || points.current.length === 0) return;

        cursor.current = mappedPoint;
        redrawFromScene(ctx);
        drawPreview(ctx, points.current, mappedPoint);
        renderViewport();
    }, [contextRef, redrawFromScene, drawPreview, renderViewport]);

    return { onPointerDown, onPointerMove };
};

export default useCurveDrawing;
