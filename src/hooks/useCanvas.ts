import { useEffect, useRef, useCallback, type PointerEvent, useContext } from "react";
import { PaintContext } from "../context/PaintContext";
import { Shape } from "../types/ShapeTypes";
import generator from "../types/ShapeGenerator";
import FreeForm from "../types/FreeForm";
import FloodFillShape from "../shapes/FloodFillShape";
import { map, type Point } from "../types/Graphics";
import useImage from "./useImage";
import useSelection from "./useSelection";
import useHistory from "./useHistory";
import useReplacement from "./useReplacement";
import { ReplacementContext } from "../context/ReplacementContext";
import { SettingsContext } from "../context/SettingsContext";

const useCanvas = () => {
    const { 
        canvasRef, 
        containerRef, 
        contextRef, 
        thickness, 
        currentColor, 
        isEraserActive, 
        isFillActive,
        isSelectionActive,
        pixelated,
        selectedShape
    } = useContext(PaintContext)!;

    const { pixelSize, lineAlgorithm, gridDisplayMode } = useContext(SettingsContext)!;

    const isDrawing = useRef(false);
    const start = useRef<Point>({x: 0, y: 0});

    const { 
        push: pushSnapshot, 
        undo: undoSnapshot, 
        redo: redoSnapshot,
        last: lastSnapshot
    } = useHistory<ImageData>(50);

    const currentShape = useRef<Shape | null>(null);

    const saveCurrentState = useCallback((snapshot: ImageData | null) => {
        if(snapshot) pushSnapshot(snapshot);
    }, [pushSnapshot]);

    const {
        takeSnapshot,
        restoreSnapshot,
        copySnapshot,
        pasteSnapshot
    } = useImage(saveCurrentState);

    const {
        startSelection,
        updateSelection,
        stopSelection
    } = useSelection();

    const {
        drawGrid,
        clearGrid
    } = useReplacement();

    const { replacementCanvasRef, replacementContextRef } = useContext(ReplacementContext)!;

    useEffect(() => {
        const setupCanvas = () => {
            const canvas = canvasRef.current;
            const replacementCanvas = replacementCanvasRef.current;
            const parent = containerRef.current;

            if(canvas && replacementCanvas && parent) {
                const rect = parent.getBoundingClientRect();
                const cssWidth = Math.floor(rect.width) * 2;
                const cssHeight = Math.floor(rect.height) * 2;

                canvas.style.width = cssWidth  + "px";
                canvas.style.height = cssHeight + "px";
                canvas.width = cssWidth;
                canvas.height = cssHeight;

                replacementCanvas.style.width = cssWidth + "px";
                replacementCanvas.style.height = cssHeight + "px";
                replacementCanvas.width = cssWidth;
                replacementCanvas.height = cssHeight;

                const contextSettings: CanvasRenderingContext2DSettings = {
                    alpha: true,
                    willReadFrequently: true
                };

                const ctx = canvas.getContext("2d", contextSettings);
                if(ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.globalAlpha = 1;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    contextRef.current = ctx;
                }

                const replacementCtx = replacementCanvas.getContext("2d");
                if(replacementCtx) {
                    replacementCtx.imageSmoothingEnabled = false;
                    replacementContextRef.current = replacementCtx;
                }

                if(pixelated && gridDisplayMode !== 'none') drawGrid(cssWidth, cssHeight);
                else clearGrid(cssWidth, cssHeight);
                
                const snapshot = lastSnapshot();
                if(snapshot) restoreSnapshot(snapshot);
            }
        };

        setupCanvas();
        containerRef.current?.addEventListener('resize', setupCanvas);
        return () => containerRef.current?.removeEventListener('resize', setupCanvas);
    }, [pixelated, pixelSize, thickness, currentColor, canvasRef, replacementCanvasRef, containerRef, contextRef, replacementContextRef, drawGrid, clearGrid, restoreSnapshot, lastSnapshot, gridDisplayMode]);

    const undo = useCallback(() => {
        const { current: previousSnapshot } = undoSnapshot();
        if(previousSnapshot) restoreSnapshot(previousSnapshot);
    }, [restoreSnapshot, undoSnapshot]);

    const redo = useCallback(() => {
        const currentSnap = redoSnapshot();
        if(currentSnap) restoreSnapshot(currentSnap);
    }, [redoSnapshot, restoreSnapshot]);

    const handlePointerDown = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if(e.button !== 0) return;

        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        
        if(ctx && canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            isDrawing.current = true;
            start.current = (pixelated) ? map({ x: x, y: y }, pixelSize) : { x: x, y: y };

            if(isSelectionActive) {
                startSelection({ x, y });
            } else if(isFillActive) {
                const floodFillShape = new FloodFillShape({
                    point: start.current,
                    strokeStyle: currentColor.current,
                    isEraser: isEraserActive,
                    pixelated: pixelated,
                    pixelSize: pixelSize
                });
                
                floodFillShape.draw(ctx);
                currentShape.current = floodFillShape;
            } else {
                if(selectedShape === 'freeform') {
                    const form = new FreeForm([start.current], {
                        strokeStyle: currentColor.current,
                        lineWidth: thickness.current,
                        isEraser: isEraserActive,
                        filled: isFillActive,
                        pixelated: pixelated,
                        pixelSize: pixelSize,
                        lineAlgorithm: lineAlgorithm
                    });
                    
                    form.draw(ctx);
                    currentShape.current = form;
                }
            }
        }
    }, [contextRef, canvasRef, pixelated, pixelSize, isSelectionActive, isFillActive, startSelection, currentColor, isEraserActive, selectedShape, thickness, lineAlgorithm]);

    const rafId = useRef<number | null>(null);
    const pendingPoint = useRef<Point | null>(null);

    const handlePointerMove = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
        if(!isDrawing.current) return;

        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if(!ctx || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const point = (pixelated) ? map({ x, y }, pixelSize) : { x, y };

        if(isSelectionActive) {
            updateSelection({ x, y });
        } else if(selectedShape === 'freeform') {
            if(currentShape.current instanceof FreeForm) {
                currentShape.current.lineTo(point, ctx);
            }
        } else {
            pendingPoint.current = point;
            if(rafId.current === null) {
                rafId.current = requestAnimationFrame(() => {
                    rafId.current = null;
    
                    if(pendingPoint.current) {
                        const snapshot = lastSnapshot();
                        if(snapshot) restoreSnapshot(snapshot);
                        else ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        const shape = generator({
                            start: start.current,
                            end: pendingPoint.current,
                            color: currentColor.current,
                            thickness: thickness.current,
                            kind: selectedShape,
                            pixelated: pixelated,
                            pixelSize: pixelSize,
                            lineAlgorithm: lineAlgorithm
                        });
        
                        currentShape.current = shape;
                        shape.draw(ctx);
                    }
                });
            }   
        }
    }, [contextRef, canvasRef, pixelated, pixelSize, lineAlgorithm, isSelectionActive, selectedShape, updateSelection, lastSnapshot, restoreSnapshot, currentColor, thickness]);

    const handlePointerUp = useCallback(() => {
        if(isDrawing.current) {
            if(rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
            
            if(isSelectionActive) stopSelection();
            else if(currentShape.current) saveCurrentState(takeSnapshot());
    
            isDrawing.current = false;
            currentShape.current = null;
            const ctx = contextRef.current;
            if(ctx) {
                ctx.beginPath();
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    }, [isSelectionActive, contextRef, stopSelection, saveCurrentState, takeSnapshot]);

    const saveSnapshot = useCallback(() => {
        saveCurrentState(takeSnapshot());
    }, [saveCurrentState, takeSnapshot]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        undo,
        redo,
        pasteSnapshot,
        copySnapshot,
        saveSnapshot
    };
};

export default useCanvas;