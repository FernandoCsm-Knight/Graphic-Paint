'use client';

import { LuGripHorizontal } from "react-icons/lu";
import { useContext, useState } from "react";
import { PaintContext } from "../_context/PaintContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import type { Point } from "@/types/geometry";
import { useDraggable } from "@/hooks/useDraggable";

const HANDLE_HEIGHT = 40;

const getSafeAreaBottom = (): number => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom').trim();
    return parseFloat(val) || 0;
};

const PageSizeEraser = () => {
    const { canvasRef, contextRef, renderViewport, saveSnapshotRef } = useContext(PaintContext)!;
    const { containerRef, viewOffset, zoom } = useWorkspaceContext();
    const [isActive, setIsActive] = useState(false);
    const [previewHeight, setPreviewHeight] = useState(0);

    const getContainerMetrics = () => {
        const container = containerRef.current;

        return {
            width: container?.clientWidth ?? 0,
            height: container?.clientHeight ?? 0,
        };
    };

    const getInitialPosition = (): Point => ({
        x: 0,
        y: Math.max(0, getContainerMetrics().height - HANDLE_HEIGHT - getSafeAreaBottom()),
    });

    const eraseFromBottom = (point: Point) => {
        const viewportCanvas = canvasRef.current;   // on-screen canvas (for position)
        const container = containerRef.current;
        const ctx = contextRef.current;
        if(!viewportCanvas || !container || !ctx) return;

        const docCanvas = ctx.canvas;               // off-screen document canvas (for dimensions)
        const containerRect = container.getBoundingClientRect();
        const rect = viewportCanvas.getBoundingClientRect();
        const containerHeight = container.clientHeight;
        const eraseTop = Math.max(0, Math.min(containerHeight, point.y + HANDLE_HEIGHT));
        const previewH = Math.max(0, containerHeight - eraseTop);
        setPreviewHeight(previewH);

        // Intersect the erase band [eraseTop, container bottom] with the canvas rect
        const canvasTop = rect.top - containerRect.top;
        const canvasBottom = canvasTop + rect.height;
        const bandTop = Math.max(eraseTop, canvasTop);
        const bandBottom = Math.min(containerHeight, canvasBottom);
        const overlapViewport = Math.max(0, bandBottom - bandTop);
        if (overlapViewport <= 0) return; // nothing to clear on the canvas

        const localTop = bandTop - canvasTop;
        const localBottom = bandBottom - canvasTop;
        const worldTop = Math.max(0, (-viewOffset.y + localTop) / zoom);
        const worldBottom = Math.min(docCanvas.height, (-viewOffset.y + localBottom) / zoom);
        const clearHeight = Math.max(0, worldBottom - worldTop);

        if (clearHeight > 0) {
            ctx.clearRect(0, worldTop, docCanvas.width, clearHeight);
            renderViewport();
        }
    };

    const handleDrag = (point: Point) => {
        const { height } = getContainerMetrics();
        const minY = 0;
        const maxY = Math.max(0, height - HANDLE_HEIGHT - getSafeAreaBottom());
        const clampedY = Math.min(Math.max(minY, point.y), maxY);

        if(clampedY !== point.y) setPosition((prev) => ({ x: prev.x, y: clampedY }));

        eraseFromBottom({ x: 0, y: clampedY });
    };

    const handleResizeAndScroll = (): Point => {
        return getInitialPosition();
    };

    const handleDragEnd = () => {
        setIsActive(false);
        setPreviewHeight(0);
        setPosition(getInitialPosition());
        saveSnapshotRef.current?.();
    }

    const { elementRef, handlePointerDown, dragStyle, setPosition } = useDraggable({
        initial: getInitialPosition,
        axis: "y",
        clamp: true,
        referenceFrame: "offsetParent",
        onDragStart: () => setIsActive(true),
        onDrag: handleDrag,
        onDragEnd: handleDragEnd,
        onResize: handleResizeAndScroll,
        onScroll: handleResizeAndScroll
    });

    return (
        <>
            {isActive && previewHeight > 0 && (
                <div 
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${previewHeight}px`,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        pointerEvents: 'none',
                        zIndex: 49,
                        border: '2px dashed rgb(239, 68, 68)',
                    }}
                />
            )}

            <div
            ref={elementRef}
            onPointerDown={handlePointerDown}
            style={{...dragStyle, transition: isActive ? 'none' : 'top 0.3s ease-out, left 0.3s ease-out'}}
            className="absolute inset-x-0 flex items-center justify-center w-full">
                <div
                    className={`
                        w-full
                        z-50
                        flex
                        justify-between
                        items-center
                        rounded-xl
                        shadow-lg
                        backdrop-blur-sm
                        max-w-[95vw]
                        max-h-[95vh]
                        overflow-hidden
                        ${isActive ? 'bg-red-400/40 cursor-grabbing' : 'bg-gray-200/30 cursor-grab hover:bg-gray-300/40'}
                    `}>
                    <div className={`grow border-t-2 rounded-2xl mx-4 transition-colors ${isActive ? 'border-red-500' : 'border-gray-400'}`}></div>
                    <LuGripHorizontal className={`transition-colors ${isActive ? 'text-red-600' : 'text-gray-500'} sm:h-5 sm:w-5 h-4 w-4`}/>
                    <div className={`grow border-t-2 rounded-2xl mx-4 transition-colors ${isActive ? 'border-red-500' : 'border-gray-400'}`}></div>
                </div>
            </div>
        </>
    );

};

export default PageSizeEraser;
