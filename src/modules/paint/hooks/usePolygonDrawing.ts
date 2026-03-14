import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import FreePolygon from "../shapes/FreePolygon";
import { type Shape } from "../shapes/ShapeTypes";
import bresenham from "../algorithms/BresenhamLine";
import dda from "../algorithms/DDA";
import type { Point } from "../../../functions/geometry";
import type { Geometric } from "../types/Graphics";
import type { LineAlgorithm } from "../context/SettingsContext";

type UsePolygonDrawingInput = {
    contextRef: RefObject<CanvasRenderingContext2D | null>;
    renderViewport: () => void;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    enterPending: (shape: Shape) => void;
    currentColor: RefObject<string>;
    thickness: RefObject<number>;
    pixelated: boolean;
    pixelSize: number;
    lineAlgorithm: LineAlgorithm;
    selectedShape: Geometric;
};

const usePolygonDrawing = ({
    contextRef,
    renderViewport,
    redrawFromScene,
    enterPending,
    currentColor,
    thickness,
    pixelated,
    pixelSize,
    lineAlgorithm,
    selectedShape,
}: UsePolygonDrawingInput) => {
    const points = useRef<Point[]>([]);
    const cursor = useRef<Point | null>(null);
    const lastClickTime = useRef<number>(0);

    // ── Preview rendering ─────────────────────────────────────────────────────

    const drawPreview = useCallback((
        ctx: CanvasRenderingContext2D,
        pts: Point[],
        cur: Point | null,
    ) => {
        if (pts.length === 0) return;

        const color = currentColor.current;
        const lw = Math.max(1, thickness.current);
        const algorithm = lineAlgorithm === 'dda' ? dda : bresenham;

        if (pixelated) {
            const drawBlock = (p: Point, _ctx: CanvasRenderingContext2D) => {
                const hw = Math.floor(lw / 2);
                const s = (lw % 2 === 0) ? -hw + 1 : -hw;
                for (let ox = s; ox <= hw; ox++) {
                    for (let oy = s; oy <= hw; oy++) {
                        _ctx.fillRect((p.x + ox) * pixelSize, (p.y + oy) * pixelSize, pixelSize, pixelSize);
                    }
                }
            };

            ctx.fillStyle = color;

            if (pts.length >= 2) {
                for (let i = 0; i < pts.length - 1; i++) {
                    algorithm(pts[i], pts[i + 1], drawBlock, ctx);
                }
            }

            for (const pt of pts) {
                ctx.fillRect(pt.x * pixelSize, pt.y * pixelSize, pixelSize, pixelSize);
            }

            if (cur) {
                const last = pts[pts.length - 1];

                ctx.globalAlpha = 0.55;
                ctx.fillStyle = color;
                algorithm(last, cur, drawBlock, ctx);
                ctx.globalAlpha = 1;

                if (pts.length >= 2) {
                    ctx.globalAlpha = 0.40;
                    ctx.fillStyle = color;
                    let idx = 0;
                    algorithm(cur, pts[0], (p, _ctx) => {
                        if (idx % 4 < 2) drawBlock(p, _ctx);
                        idx++;
                    }, ctx);
                    ctx.globalAlpha = 1;
                }
            }
        } else {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);

            if (pts.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();
            }

            ctx.fillStyle = color;
            for (const pt of pts) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(3, lw + 1), 0, Math.PI * 2);
                ctx.fill();
            }

            if (cur) {
                const last = pts[pts.length - 1];

                ctx.globalAlpha = 0.55;
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(cur.x, cur.y);
                ctx.stroke();
                ctx.globalAlpha = 1;

                if (pts.length >= 2) {
                    ctx.globalAlpha = 0.45;
                    ctx.setLineDash([6, 5]);
                    ctx.beginPath();
                    ctx.moveTo(cur.x, cur.y);
                    ctx.lineTo(pts[0].x, pts[0].y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 1;

                    const angle = Math.atan2(pts[0].y - cur.y, pts[0].x - cur.x);
                    const arrowSize = Math.max(8, lw * 3);
                    ctx.globalAlpha = 0.55;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    ctx.lineTo(pts[0].x - arrowSize * Math.cos(angle - Math.PI / 6), pts[0].y - arrowSize * Math.sin(angle - Math.PI / 6));
                    ctx.lineTo(pts[0].x - arrowSize * Math.cos(angle + Math.PI / 6), pts[0].y - arrowSize * Math.sin(angle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }

            ctx.restore();
        }
    }, [currentColor, thickness, pixelated, pixelSize, lineAlgorithm]);

    // ── Finalize ──────────────────────────────────────────────────────────────

    const finalize = useCallback(() => {
        const pts = points.current;
        const ctx = contextRef.current;

        points.current = [];
        cursor.current = null;

        if (!ctx) return;
        redrawFromScene(ctx);

        if (pts.length >= 2) {
            const shape = new FreePolygon([...pts], {
                strokeStyle: currentColor.current,
                lineWidth: thickness.current,
                pixelated,
                pixelSize,
                lineAlgorithm,
            });
            shape.draw(ctx);
            enterPending(shape);
        } else {
            renderViewport();
        }
    }, [contextRef, redrawFromScene, currentColor, thickness, pixelated, pixelSize, lineAlgorithm, enterPending, renderViewport]);

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

    // ── Cancel when switching away from polygon tool ──────────────────────────

    useEffect(() => {
        if (selectedShape !== 'polygon' && points.current.length > 0) cancel();
    }, [selectedShape, cancel]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (selectedShape !== 'polygon' || points.current.length === 0) return;
            if (e.key === 'Enter') { e.preventDefault(); finalize(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedShape, finalize, cancel]);

    // ── Event handlers exposed to useDrawingHandlers ──────────────────────────

    const onPointerDown = useCallback((mappedPoint: Point) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        const now = Date.now();
        const isDoubleClick = now - lastClickTime.current < 300;
        lastClickTime.current = now;

        points.current.push(mappedPoint);

        if (isDoubleClick && points.current.length >= 2) {
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

export default usePolygonDrawing;
