import { useEffect, useRef, useCallback, type PointerEvent, useContext } from "react";
import { PaintContext } from "../context/PaintContext";
import type { Point, Shape } from "../types/ShapeTypes";
import generator from "../types/ShapeGenerator";
import FreeForm from "../types/FreeForm";
import Board from "../types/Board";
import ClipboardImage from "../types/ClipboardImage";
import { FloodFill } from "../algorithms/FloodFill";

const useCanvas = (pixelSize: number = 20) => {
    const { 
        canvasRef, 
        containerRef, 
        contextRef, 
        thickness, 
        currentColor, 
        isEraserActive, 
        isFillActive,
        pixelated,
        selectedShape
    } = useContext(PaintContext)!;

    const isDrawing = useRef(false);
    const start = useRef<Point>({x: 0, y: 0});

    const drawnShapes = useRef<Shape[]>([]);
    const redoStackRef = useRef<Shape[]>([]);
    const currentShape = useRef<Shape | null>(null);

    const board = useRef<Board | null>(null);
    const lastPixelatedMode = useRef<boolean>(pixelated);

    const pasteImage = (image: HTMLImageElement) => {
        drawnShapes.current.push(new ClipboardImage(image));
        redrawAllShapes();
    };

    const copyImage = (): Promise<Blob | null> => {
        const canvas = canvasRef.current;

        return new Promise((resolve) => {
            if(canvas) {
                canvas.toBlob((blob) => {
                    resolve(blob);
                });
            } else {
                resolve(null);
            }
        });
    }

    const redrawAllShapes = useCallback(() => {
        const ctx = contextRef.current;
        if(!ctx) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        if(lastPixelatedMode.current !== pixelated) {
            drawnShapes.current = [board.current!];
            redoStackRef.current = [];
            lastPixelatedMode.current = pixelated;
        }

        drawnShapes.current.forEach(shape => shape.draw(ctx));
    }, [drawnShapes, pixelated, board, contextRef]);

    useEffect(() => {
        const setupCanvas = (preserve = true) => {
            const canvas = canvasRef.current;
            const parent = containerRef.current;

            if(canvas && parent) {
                const rect = parent.getBoundingClientRect();
                const cssWidth = Math.floor(rect.width);
                const cssHeight = Math.floor(rect.height);

                canvas.style.width = cssWidth + "px";
                canvas.style.height = cssHeight + "px";
                canvas.width = cssWidth;
                canvas.height = cssHeight;

                board.current = new Board(
                    cssWidth, 
                    cssHeight, 
                    {
                        strokeStyle: "#ddd",
                        lineWidth: 1,
                        pixelSize: pixelSize,
                        pixelated: pixelated,
                    }
                );

                if(drawnShapes.current.length === 0) {
                    drawnShapes.current = [board.current];
                } else {
                    drawnShapes.current[0] = board.current;
                }

                const ctx = canvas.getContext("2d");
                if(ctx) {
                    ctx.imageSmoothingEnabled = false;
                    
                    ctx.globalAlpha = 1;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    contextRef.current = ctx;

                    if(preserve) redrawAllShapes();
                }
            }
        };

        setupCanvas(false);
        const ro = new ResizeObserver(() => setupCanvas(true));
        if(containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [pixelated, pixelSize, thickness, currentColor, board, canvasRef, containerRef, contextRef, redrawAllShapes]);

    const undo = useCallback(() => {
        if(drawnShapes.current.length <= 1) return;

        const current = drawnShapes.current.pop();
        if(current) {
            redoStackRef.current.push(current);
            redrawAllShapes();
        }
    }, [redrawAllShapes]);

    const redo = useCallback(() => {
        if(redoStackRef.current.length === 0) return;

        const current = redoStackRef.current.pop();
        if(current) {
            drawnShapes.current.push(current);
            redrawAllShapes();
        }
    }, [redrawAllShapes]);

    const handlePointerDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        
        if(ctx && canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if(isFillActive.current && pixelated) {
                FloodFill.fill(ctx, board.current!.map({ x: x, y: y }), currentColor.current, pixelSize);
                return;
            }

            isDrawing.current = true;
            start.current = (pixelated) ? board.current!.map({ x: x, y: y }) : { x: x, y: y };

            if(selectedShape.current === 'freeform') {
                const form = new FreeForm([start.current], {
                    strokeStyle: currentColor.current,
                    lineWidth: thickness.current,
                    isEraser: isEraserActive.current,
                    pixelated: pixelated,
                    pixelSize: pixelSize
                });

                currentShape.current = form;
            }
        }
    }, [start, selectedShape, isEraserActive, isFillActive, pixelated, pixelSize, currentColor, thickness, canvasRef, contextRef]);

    const handlePointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if(isDrawing.current) {
            const ctx = contextRef.current;
            const canvas = canvasRef.current;
            
            if(ctx && canvas) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const point = (pixelated) ? board.current!.map({ x: x, y: y }) : { x: x, y: y };

                if(selectedShape.current === 'freeform') {
                    if(currentShape.current instanceof FreeForm) {
                        currentShape.current.lineTo(point, ctx);
                    }
                } else {
                    if(currentShape.current) redrawAllShapes();

                    const shape = generator({ 
                        start: start.current, 
                        end: point,
                        color: currentColor.current,
                        thickness: thickness.current,
                        kind: selectedShape.current,
                        pixelated: pixelated,
                        pixelSize: pixelSize
                    });

                    currentShape.current = shape;
                    shape.draw(ctx);
                } 
            }
        }
    }, [selectedShape, redrawAllShapes, pixelated, pixelSize, currentColor, thickness, canvasRef, contextRef]);

    const handlePointerUp = useCallback(() => {
        if(currentShape.current) {
            drawnShapes.current.push(currentShape.current);
            redoStackRef.current = [];
        }

        isDrawing.current = false;
        currentShape.current = null;
        const ctx = contextRef.current;
        if(ctx) {
            ctx.beginPath();
            ctx.globalCompositeOperation = 'source-over';
        }
    }, [contextRef]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        undo,
        redo,
        pasteImage,
        copyImage
    };
};

export default useCanvas;