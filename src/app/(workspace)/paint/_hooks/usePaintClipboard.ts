import { useCallback, useEffect, useRef } from "react";
import { ClipboardImageLoader } from "../_utils/ClipboardImageLoader";
import {
    deserializePaintClipboardShape,
    serializePaintClipboardShape,
    type PaintClipboardShapePayload,
} from "../_utils/scenePersistence";
import ImageShape from "../_shapes/ImageShape";
import ShapeGroup from "../_shapes/ShapeGroup";
import { Shape } from "../_shapes/ShapeTypes";
import type { Point } from "@/types/geometry";

const STANDARD_CLIPBOARD_PASTE_OFFSET = 24;
const PIXELATED_CLIPBOARD_PASTE_OFFSET = 1;
const SHAPE_CLIPBOARD_STORAGE_KEY = 'paint-shape-clipboard';
const SHAPE_CLIPBOARD_MARKER = '__GRAPHIC_PAINT_SHAPE__';

type ShapeClipboardEntry = {
    payload: PaintClipboardShapePayload;
    pasteCount: number;
};

type UsePaintClipboardInput = {
    contextRef: React.RefObject<CanvasRenderingContext2D | null>;
    containerRef: React.RefObject<HTMLElement | null>;
    documentCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    pendingShapeRef: React.RefObject<Shape | null>;
    viewOffset: Point;
    zoom: number;
    pushShape: (shape: Shape) => void;
    redrawFromScene: (ctx: CanvasRenderingContext2D) => void;
    enterPendingShape: (shape: Shape, options?: {
        onCancel?: () => void;
        onConfirm?: () => void;
        onLock?: () => void;
        isGroupLocked?: boolean;
    }) => void;
    confirmPendingShape: () => void;
};

type PasteSnapshotOptions = {
    silent?: boolean;
};

const usePaintClipboard = ({
    contextRef,
    containerRef,
    documentCanvasRef,
    pendingShapeRef,
    viewOffset,
    zoom,
    pushShape,
    redrawFromScene,
    enterPendingShape,
    confirmPendingShape,
}: UsePaintClipboardInput) => {
    const shapeClipboardRef = useRef<ShapeClipboardEntry | null>(null);

    const persistShapeClipboard = useCallback((entry: ShapeClipboardEntry | null) => {
        if (typeof window === 'undefined') return;

        try {
            if (!entry) {
                window.sessionStorage.removeItem(SHAPE_CLIPBOARD_STORAGE_KEY);
                return;
            }

            window.sessionStorage.setItem(SHAPE_CLIPBOARD_STORAGE_KEY, JSON.stringify(entry));
        } catch {
            // Ignore storage failures; in-memory clipboard still works for the session.
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const raw = window.sessionStorage.getItem(SHAPE_CLIPBOARD_STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as Partial<ShapeClipboardEntry>;
            if (!parsed || typeof parsed !== 'object' || !parsed.payload) return;

            shapeClipboardRef.current = {
                payload: parsed.payload,
                pasteCount: typeof parsed.pasteCount === 'number' ? parsed.pasteCount : 0,
            };
        } catch {
            window.sessionStorage.removeItem(SHAPE_CLIPBOARD_STORAGE_KEY);
        }
    }, []);

    const writeShapeClipboardMarker = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;

        try {
            await navigator.clipboard.writeText(SHAPE_CLIPBOARD_MARKER);
            return true;
        } catch {
            return false;
        }
    }, []);

    const isShapeClipboardCurrent = useCallback(async () => {
        if (shapeClipboardRef.current === null) return false;
        if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return true;

        try {
            const text = await navigator.clipboard.readText();
            return text === SHAPE_CLIPBOARD_MARKER;
        } catch {
            return true;
        }
    }, []);

    const enterClipboardPendingShape = useCallback((shape: Shape) => {
        if (shape instanceof ShapeGroup) {
            enterPendingShape(shape, {
                onConfirm: () => {
                    for (const child of shape.shapes) {
                        pushShape(child);
                    }
                },
                onLock: () => {
                    pushShape(shape);
                },
            });
            return;
        }

        enterPendingShape(shape);
    }, [enterPendingShape, pushShape]);

    const copySnapshot = useCallback(() => {
        const docCanvas = documentCanvasRef.current;
        if (!docCanvas) return;

        shapeClipboardRef.current = null;
        persistShapeClipboard(null);

        docCanvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await ClipboardImageLoader.copyImageToClipboard(blob);
                    alert('Imagem copiada para a área de transferência');
                } catch {
                    alert('Falha ao copiar a imagem para a área de transferência');
                }
            }
        }, 'image/png');
    }, [documentCanvasRef, persistShapeClipboard]);

    const pasteSnapshot = useCallback(async ({ silent = false }: PasteSnapshotOptions = {}) => {
        const ctx = contextRef.current;
        const container = containerRef.current;
        if (!ctx) return false;

        try {
            if (pendingShapeRef.current !== null) {
                confirmPendingShape();
            }
            const img = await ClipboardImageLoader.loadImageFromClipboard();

            const vpW = container?.clientWidth ?? ctx.canvas.width;
            const vpH = container?.clientHeight ?? ctx.canvas.height;
            const worldCenterX = (vpW / 2 - viewOffset.x) / zoom;
            const worldCenterY = (vpH / 2 - viewOffset.y) / zoom;
            const x = Math.round(worldCenterX - img.naturalWidth / 2);
            const y = Math.round(worldCenterY - img.naturalHeight / 2);

            const imageShape = new ImageShape(img, x, y, img.naturalWidth, img.naturalHeight);
            redrawFromScene(ctx);
            imageShape.draw(ctx);
            enterPendingShape(imageShape);
            return true;
        } catch {
            if (!silent) {
                alert('Falha ao colar imagem da área de transferência');
            }
            return false;
        }
    }, [
        confirmPendingShape,
        containerRef,
        contextRef,
        enterPendingShape,
        pendingShapeRef,
        redrawFromScene,
        viewOffset,
        zoom,
    ]);

    const copyPendingShapeToClipboard = useCallback(async () => {
        const shape = pendingShapeRef.current;
        if (!shape) return false;

        const payload = await serializePaintClipboardShape(shape);
        if (!payload) return false;

        shapeClipboardRef.current = {
            payload,
            pasteCount: 0,
        };
        persistShapeClipboard(shapeClipboardRef.current);
        await writeShapeClipboardMarker();

        return true;
    }, [pendingShapeRef, persistShapeClipboard, writeShapeClipboardMarker]);

    const hasShapeClipboard = useCallback(() => shapeClipboardRef.current !== null, []);

    const pasteShapeFromClipboard = useCallback(async () => {
        const clipboardEntry = shapeClipboardRef.current;
        const ctx = contextRef.current;
        if (!clipboardEntry || !ctx) return false;

        if (pendingShapeRef.current !== null) {
            confirmPendingShape();
        }

        const clonedShape = await deserializePaintClipboardShape(clipboardEntry.payload);
        if (!(clonedShape instanceof Shape)) {
            shapeClipboardRef.current = null;
            persistShapeClipboard(null);
            return false;
        }

        clipboardEntry.pasteCount += 1;
        persistShapeClipboard(clipboardEntry);
        const step = clonedShape.pixelated ? PIXELATED_CLIPBOARD_PASTE_OFFSET : STANDARD_CLIPBOARD_PASTE_OFFSET;
        const delta = step * clipboardEntry.pasteCount;
        clonedShape.moveBy(delta, delta);

        redrawFromScene(ctx);
        enterClipboardPendingShape(clonedShape);
        return true;
    }, [
        confirmPendingShape,
        contextRef,
        enterClipboardPendingShape,
        pendingShapeRef,
        persistShapeClipboard,
        redrawFromScene,
    ]);

    return {
        copySnapshot,
        pasteSnapshot,
        copyPendingShapeToClipboard,
        hasShapeClipboard,
        isShapeClipboardCurrent,
        pasteShapeFromClipboard,
    };
};

export default usePaintClipboard;
