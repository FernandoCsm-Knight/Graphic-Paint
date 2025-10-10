import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { type Point } from "../types/Graphics";
import type React from "react";

type DraggableHandle = (e: React.PointerEvent<HTMLElement>) => void;

export type DraggableOptions = {
  initial?: Point | "center";
  clamp?: boolean;
  axis?: "x" | "y" | "both";

  onDragStart?: () => void;
  onDragEnd?: (pos: Point) => void;
  onDrag?: (pos: Point) => void;
  onResize?: (prev: Point) => Point;
};

export type UseDraggableReturn = {
    ref: RefObject<HTMLDivElement>;
    position: Point;
    setPosition: React.Dispatch<React.SetStateAction<Point>>;
    onPointerDown: DraggableHandle;
    style: React.CSSProperties;
}

export const useDraggable = (options: DraggableOptions = {}) => {
    const { initial = { x: 0, y: 0 }, clamp = true, axis = "both", onDragStart, onDragEnd, onDrag, onResize } = options;

    const [position, setPosition] = useState<Point>(() => (initial === "center" ? { x: 0, y: 20 } : initial));
    const targetRef = useRef<HTMLDivElement | null>(null);
    const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
    const posRef = useRef<Point>(position);
    const initialPosRef = useRef<Point>(position);

    const clampToViewport = useCallback((x: number, y: number): Point => {
        if (!clamp) return { x, y };
        const el = targetRef.current;
        const w = el?.offsetWidth ?? 0;
        const h = el?.offsetHeight ?? 0;
        
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        const minX = scrollX;
        const minY = scrollY;
        const maxX = scrollX + window.innerWidth - w;
        const maxY = scrollY + window.innerHeight - h;
        
        return {
            x: Math.min(Math.max(minX, x), maxX),
            y: Math.min(Math.max(minY, y), maxY),
        };
    }, [clamp]);

    useEffect(() => {
        posRef.current = position;
    }, [position]);

    useEffect(() => {
        if (initial !== "center") return;
        const el = targetRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        const x = scrollX + Math.max(0, Math.round(window.innerWidth / 2 - rect.width / 2));
        const y = scrollY + 20; 
        setPosition({ x, y });
    }, [initial]);

    useEffect(() => {
        const element = targetRef.current;
        if (!element) return;

        const handleWindowResize = () => {
            setPosition((prev: Point) => (onResize) ? onResize(prev) : clampToViewport(prev.x, prev.y));
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [clampToViewport, onResize]);

    useEffect(() => {
        const element = targetRef.current;
        if (!element) return;

        const handleWindowScroll = () => {
            setPosition((prev: Point) => clampToViewport(prev.x, prev.y));
        };

        window.addEventListener('scroll', handleWindowScroll);
        return () => window.removeEventListener('scroll', handleWindowScroll);
    }, [clampToViewport]);

    const onPointerDown: DraggableHandle = useCallback((e) => {
        e.preventDefault();
        const el = targetRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        
        dragOffsetRef.current = {
            dx: e.clientX - rect.left,
            dy: e.clientY - rect.top,
        };

        initialPosRef.current = { ...posRef.current };
        const handlePointerMove = (ev: PointerEvent) => {
            const currentScrollX = window.scrollX || window.pageXOffset;
            const currentScrollY = window.scrollY || window.pageYOffset;
            
            let nx = ev.clientX + currentScrollX - dragOffsetRef.current.dx;
            let ny = ev.clientY + currentScrollY - dragOffsetRef.current.dy;

            if(axis === "x") ny = initialPosRef.current.y;
            else if (axis === "y") nx = initialPosRef.current.x;

            const next = clampToViewport(nx, ny);
            setPosition(next);
            onDrag?.(next);
        };

        const handlePointerUp = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            onDragEnd?.(posRef.current);
        };

        onDragStart?.();
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }, [clampToViewport, onDragEnd, onDragStart, axis, onDrag]);

    return {
        ref: targetRef as RefObject<HTMLDivElement>,
        position,
        setPosition,
        onPointerDown,
        style: { left: position.x, top: position.y } as const,
    };
};
