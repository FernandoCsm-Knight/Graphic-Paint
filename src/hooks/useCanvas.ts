import { useEffect, useRef, useCallback, type PointerEvent, useContext } from "react";
import { PaintContext } from "../context/PaintContext";

const useCanvas = (pixelSize: number = 20, undoLimit: number = 50) => {
    const { thickness, currentColor, isEraserActive, pixelated } = useContext(PaintContext)!;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    const isDrawing = useRef(false);

    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);

    const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, px: number) => {
        const lastStroke = ctx.strokeStyle;
        const lastLineWidth = ctx.lineWidth;

        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;

        for(let x = 0; x <= width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * px, 0);
            ctx.lineTo(x * px, height * px);
            ctx.stroke();
        }

        for(let y = 0; y <= height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * px);
            ctx.lineTo(width * px, y * px);
            ctx.stroke();
        }

        ctx.strokeStyle = lastStroke;
        ctx.lineWidth = lastLineWidth;
    }, []);

    const redrawPixelGridIfNeeded = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, px: number) => {
        if(!pixelated) return;

        const lastStroke = ctx.strokeStyle;
        const lastLineWidth = ctx.lineWidth;
        
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + px, y);
        ctx.lineTo(x + px, y + px);
        ctx.lineTo(x, y + px);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.strokeStyle = lastStroke;
        ctx.lineWidth = lastLineWidth;
    }, [pixelated]);

    useEffect(() => {
        const setupCanvas = (preserve = true) => {
            const canvas = canvasRef.current;
            const parent = containerRef.current;

            if(canvas && parent) {
                const snapshotUrl = preserve ? canvas.toDataURL() : null;
                
                if(preserve && contextRef.current) {
                    currentColor.current = contextRef.current.fillStyle as string;
                    thickness.current = contextRef.current.lineWidth;
                }

                const rect = parent.getBoundingClientRect();
                const cssWidth = Math.floor(rect.width);
                const cssHeight = Math.floor(rect.height);
                let canvasWidth = cssWidth;
                let canvasHeight = cssHeight;
                let pixelCountX = cssWidth;
                let pixelCountY = cssHeight;

                if(pixelated) {
                    pixelCountX = Math.floor(cssWidth / pixelSize);
                    pixelCountY = Math.floor(cssHeight / pixelSize);
                    canvasWidth = pixelCountX * pixelSize;
                    canvasHeight = pixelCountY * pixelSize;
                }

                canvas.style.width = canvasWidth + "px";
                canvas.style.height = canvasHeight + "px";
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                const ctx = canvas.getContext("2d");
                if(ctx) {
                    ctx.imageSmoothingEnabled = false;
                    
                    ctx.fillStyle = currentColor.current;
                    ctx.strokeStyle = currentColor.current;
                    ctx.lineWidth = thickness.current;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    contextRef.current = ctx;

                    if(snapshotUrl) {
                        const img = new Image();

                        img.onload = () => {
                            ctx.drawImage(img, 0, 0);
                            if(pixelated) drawGrid(ctx, pixelCountX, pixelCountY, pixelSize);
                        };

                        img.src = snapshotUrl;
                    } else {
                        if(pixelated) drawGrid(ctx, pixelCountX, pixelCountY, pixelSize);
                    }
                }
            }
        };

        setupCanvas(false);
        const ro = new ResizeObserver(() => setupCanvas(true));
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [pixelated, pixelSize, thickness, currentColor, drawGrid]);

    const snapshotCanvas = useCallback((): string | null => {
        let response: string | null = null;
        
        if(canvasRef.current) response = canvasRef.current.toDataURL();

        return response;
    }, []);

    const applySnapshot = useCallback((url: string) => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        const img = new Image();
        
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            if (pixelated) {
                const pixelCountX = Math.floor(canvas.width / pixelSize);
                const pixelCountY = Math.floor(canvas.height / pixelSize);
                drawGrid(ctx, pixelCountX, pixelCountY, pixelSize);
            }
        };

        img.src = url;
    }, [pixelated, pixelSize, drawGrid]);

    const pushUndoSnapshot = useCallback(() => {
        const snap = snapshotCanvas();

        if(snap) {
            const stack = undoStackRef.current;

            stack.push(snap);
            if(stack.length > undoLimit) stack.shift();
    
            redoStackRef.current = [];
        }
    }, [snapshotCanvas, undoLimit]);

    const undo = useCallback(() => {
        if(undoStackRef.current.length === 0) return;

        const current = snapshotCanvas();
        if(current) redoStackRef.current.push(current);

        const prev = undoStackRef.current.pop();
        if(prev) applySnapshot(prev);
    }, [applySnapshot, snapshotCanvas]);

    const redo = useCallback(() => {
        if(redoStackRef.current.length === 0) return;

        const current = snapshotCanvas();
        if(current) undoStackRef.current.push(current);
        
        const next = redoStackRef.current.pop();
        if(next) applySnapshot(next);
    }, [applySnapshot, snapshotCanvas]);

    const drawPixel = useCallback((ctx: CanvasRenderingContext2D, gridX: number, gridY: number, px: number) => {
        if(isEraserActive.current) {
            const pixelX = gridX * px;
            const pixelY = gridY * px;

            ctx.clearRect(pixelX, pixelY, px, px);
            redrawPixelGridIfNeeded(ctx, pixelX, pixelY, px);
        } else {
            ctx.fillRect(gridX * px, gridY * px, px, px);
        }
    }, [isEraserActive, redrawPixelGridIfNeeded]);

    const handlePointerDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        isDrawing.current = true;
        
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        
        if(ctx && canvas) {
            pushUndoSnapshot();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if(pixelated) {
                const gridX = Math.floor(x / pixelSize);
                const gridY = Math.floor(y / pixelSize);
                
                drawPixel(ctx, gridX, gridY, pixelSize);
            } else {
                ctx.beginPath();
                if(isEraserActive.current) {
                    ctx.globalCompositeOperation = 'destination-out';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = currentColor.current;
                }
                ctx.moveTo(x, y);
            }
        }
    }, [pixelated, pixelSize, drawPixel, isEraserActive, currentColor, pushUndoSnapshot]);

    const handlePointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if(isDrawing.current) {
            const ctx = contextRef.current;
            const canvas = canvasRef.current;
            
            if(ctx && canvas) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if(pixelated) {
                    const gridX = Math.floor(x / pixelSize);
                    const gridY = Math.floor(y / pixelSize);
                    
                    drawPixel(ctx, gridX, gridY, pixelSize);
                } else {
                    ctx.lineTo(x, y);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(x, y);
                }
            }
        }
    }, [pixelated, pixelSize, drawPixel]);

    const handlePointerUp = useCallback(() => {
        isDrawing.current = false;
        const ctx = contextRef.current;
        if(ctx) {
            ctx.beginPath();
            ctx.globalCompositeOperation = 'source-over';
        }
    }, []);

    const updateColor = useCallback((color: string) => {
        currentColor.current = color;
        const ctx = contextRef.current;
        if (ctx) {
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
    }, [currentColor]);

    const updateLineWidth = useCallback((lineWidth: number) => {
        thickness.current = lineWidth;
        const ctx = contextRef.current;
        if (ctx) ctx.lineWidth = lineWidth;
    }, [thickness]);

    return {
        canvasRef,
        containerRef,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        updateColor,
        updateLineWidth,
        undo,
        redo
    };
};

export default useCanvas;