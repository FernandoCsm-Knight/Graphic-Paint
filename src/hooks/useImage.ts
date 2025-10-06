import { useCallback, useContext } from "react";
import { PaintContext } from "../context/PaintContext";
import { ClipboardImageLoader } from "../utils/ClipboardImageLoader";

const useImage = (callback: (snapshot: ImageData | null) => void) => {
    const {
        contextRef,
        canvasRef
    } = useContext(PaintContext)!;

    const takeSnapshot = useCallback((offsetW: number = 0, offsetH: number = 0) => {
        const ctx = contextRef.current;
        return ctx ? ctx.getImageData(offsetW, offsetH, ctx.canvas.width, ctx.canvas.height) : null;
    }, [contextRef]);

    const restoreSnapshot = useCallback((snapshot: ImageData) => {
        const ctx = contextRef.current;
        if(ctx) ctx.putImageData(snapshot, 0, 0);
    }, [contextRef]);

    const copySnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if(canvas) {
            canvas.toBlob(async (blob) => {
                if(blob) {
                    try {
                        await ClipboardImageLoader.copyImageToClipboard(blob);
                        alert('Imagem copiada para a área de transferência');
                    } catch {
                        alert('Falha ao copiar a imagem para a área de transferência');
                    }
                }
            });
        }
    }, [canvasRef]);

    const copyCanvasToClipboard = useCallback(async (
        canvas: HTMLCanvasElement,
        successMessage: string = 'Imagem copiada para a área de transferência',
        errorMessage: string = 'Falha ao copiar a imagem para a área de transferência'
    ): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await ClipboardImageLoader.copyImageToClipboard(blob);
                        alert(successMessage);
                        resolve();
                    } catch (err) {
                        alert(errorMessage);
                        reject(err);
                    }
                } else {
                    alert(errorMessage);
                    reject(new Error('Canvas toBlob returned null'));
                }
            }, 'image/png');
        });
    }, []);

    const pasteSnapshot = useCallback(async (): Promise<void> => {
        if(contextRef.current) callback(takeSnapshot());
    }, [contextRef, callback, takeSnapshot]);

    return {
        takeSnapshot,
        restoreSnapshot,
        copySnapshot,
        pasteSnapshot,
        copyCanvasToClipboard
    };
};

export default useImage;