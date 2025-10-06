import { useCallback, useContext, useRef } from "react";
import { PaintContext } from "../context/PaintContext";
import type { Point } from "../types/Graphics";
import useImage from "./useImage";
import { ReplacementContext } from "../context/ReplacementContext";
import { SettingsContext } from "../context/SettingsContext";

const useSelection = () => {
    const {
        contextRef,
        pixelated
    } = useContext(PaintContext)!;

    const { pixelSize } = useContext(SettingsContext)!;

    const { replacementContextRef } = useContext(ReplacementContext)!;

    const selectionStart = useRef<Point | null>(null);
    const selectionEnd = useRef<Point | null>(null);

    const { copyCanvasToClipboard } = useImage(() => {});

    const snap = useCallback((value: number): number => {
        return pixelated ? Math.floor(value / pixelSize) * pixelSize : value;
    }, [pixelated, pixelSize]);

    const drawSelectionRect = useCallback((x: number, y: number, w: number, h: number) => {
        const overlay = replacementContextRef.current;
        if(!overlay) return;

        const sx = snap(x);
        const sy = snap(y);

        overlay.save();
        overlay.setLineDash([4, 4]);
        overlay.lineWidth = 1;
        overlay.strokeStyle = '#1d4ed8';
        overlay.fillStyle = 'rgba(59,130,246,0.15)';

        overlay.clearRect(0, 0, overlay.canvas.width, overlay.canvas.height);

        overlay.beginPath();
        overlay.rect(sx, sy, w, h);
        overlay.fill();
        overlay.stroke();
        overlay.restore();
    }, [replacementContextRef, snap]);

    const clearSelectionOverlay = useCallback(() => {
        const overlay = replacementContextRef.current;
        if(!overlay) return;
        overlay.clearRect(0, 0, overlay.canvas.width, overlay.canvas.height);
    }, [replacementContextRef]);

    const startSelection = useCallback((point: Point) => {
        const snappedPoint = { x: snap(point.x), y: snap(point.y) };
        selectionStart.current = snappedPoint;
        selectionEnd.current = snappedPoint;
        drawSelectionRect(snappedPoint.x, snappedPoint.y, 1, 1);
    }, [snap, drawSelectionRect]);

    const updateSelection = useCallback((point: Point) => {
        if(selectionStart.current) {
            const nx = snap(point.x);
            const ny = snap(point.y);
            selectionEnd.current = { x: nx, y: ny };
            const sx = Math.min(selectionStart.current.x, nx);
            const sy = Math.min(selectionStart.current.y, ny);
            const w = Math.abs(nx - selectionStart.current.x);
            const h = Math.abs(ny - selectionStart.current.y);
            drawSelectionRect(sx, sy, w, h);
        }
    }, [snap, drawSelectionRect]);

    const stopSelection = useCallback(() => {
        const ctx = contextRef.current;
        if(ctx && selectionStart.current && selectionEnd.current) {
            const sx = Math.min(selectionStart.current.x, selectionEnd.current.x);
            const sy = Math.min(selectionStart.current.y, selectionEnd.current.y);
            const sw = Math.abs(selectionEnd.current.x - selectionStart.current.x);
            const sh = Math.abs(selectionEnd.current.y - selectionStart.current.y);

            if(sw > 1 && sh > 1) {
                const imageData = ctx.getImageData(sx, sy, sw, sh);
                const temp = document.createElement('canvas');
                temp.width = sw; temp.height = sh;
                const tctx = temp.getContext('2d');
                if(tctx) {
                    tctx.putImageData(imageData, 0, 0);
                    copyCanvasToClipboard(temp, 'Seleção copiada para a área de transferência')
                        .catch(() => {
                            const url = temp.toDataURL('image/png');
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'recorte.png';
                            a.click();
                        }).finally(() => {
                            clearSelectionOverlay();
                        });
                }
            }
        }

        selectionStart.current = null;
        selectionEnd.current = null;
    }, [clearSelectionOverlay, contextRef, copyCanvasToClipboard]);

    return {
        startSelection,
        updateSelection,
        stopSelection
    }

};

export default useSelection;