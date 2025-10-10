import { LuGripHorizontal } from "react-icons/lu";
import { useDraggable } from "../hooks/useDraggable";
import { useContext, useState } from "react";
import { PaintContext } from "../context/PaintContext";
import type { Point } from "../types/Graphics";

const PageSizeEraser = () => {
    const { canvasRef, contextRef, saveSnapshot } = useContext(PaintContext)!;
    const [isActive, setIsActive] = useState(false);
    const [previewHeight, setPreviewHeight] = useState(0);
    
    const getInitialPosition = (): Point => ({
        x: window.innerWidth / 2,
        y: window.innerHeight - 40
    });

    const eraseFromTop = (point: Point) => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        
        if(!canvas || !ctx) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const relativeY = point.y - canvasRect.top + 20;
        
        setPreviewHeight(canvas.height - relativeY);
        
        if(relativeY > 0 && relativeY < canvas.height) {
            ctx.clearRect(0, relativeY, canvas.width, canvas.height - relativeY);
        }
    };

    const handleDrag = (point: Point) => {
        const minY = 0;
        const maxY = window.innerHeight - 20;
        const clampedY = Math.min(Math.max(minY, point.y), maxY);
        
        if (clampedY !== point.y) {
            setPosition((prev) => ({
                x: prev.x,
                y: clampedY
            }));
        }
        
        eraseFromTop({ x: point.x, y: clampedY });
    };

    const handleResize = (): Point => {
        return getInitialPosition();
    };

    const handleDragEnd = () => {
        setIsActive(false);
        setPreviewHeight(0);
        setPosition(getInitialPosition());
        if(saveSnapshot) saveSnapshot();
    }

    const { ref, onPointerDown, style, setPosition } = useDraggable({
        initial: getInitialPosition(),
        axis: "y",
        clamp: true,
        onDragStart: () => setIsActive(true),

        onDragEnd: handleDragEnd,
        onResize: handleResize
    });

    return (
        <div 
        ref={ref}
        onPointerDown={onPointerDown}
        style={{...style, transition: isActive ? 'none' : 'top 0.3s ease-out, left 0.3s ease-out'}}
        className="flex items-center justify-center w-full min-w-[100vw] absolute">
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
    );

};

export default PageSizeEraser;
