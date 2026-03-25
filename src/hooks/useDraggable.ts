import { useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction } from 'react';
import type { Point } from '../types/geometry';

type DraggableHandle = (event: ReactPointerEvent<HTMLElement>) => void;

export type DraggableOptions = {
    initial?: () => Point;
    clamp?: boolean;
    axis?: 'x' | 'y' | 'both';
    referenceFrame?: 'viewport' | 'offsetParent';
    onDragStart?: () => void;
    onDragEnd?: (position: Point) => void;
    onDrag?: (position: Point) => void;
    onResize?: (previous: Point) => Point;
    onScroll?: (previous: Point) => Point;
};

export type UseDraggableReturn = {
    elementRef: RefObject<HTMLDivElement>;
    position: Point;
    setPosition: Dispatch<SetStateAction<Point>>;
    handlePointerDown: DraggableHandle;
    dragStyle: CSSProperties;
};

export const useDraggable = (options: DraggableOptions = {}): UseDraggableReturn => {
    const {
        initial,
        clamp = true,
        axis = 'both',
        referenceFrame = 'viewport',
        onDragStart,
        onDragEnd,
        onDrag,
        onResize,
        onScroll
    } = options;

    const hasInitialPosition = !!initial;
    const [position, setPosition] = useState<Point>(() => initial ? initial() : { x: 0, y: 20 });
    const positionRef = useRef<Point>(position);
    const targetRef = useRef<HTMLDivElement | null>(null);
    const dragOffsetRef = useRef({ dx: 0, dy: 0 });

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const getBoundsRect = useCallback(() => {
        const element = targetRef.current;
        const parent = element?.offsetParent;

        if (referenceFrame === 'offsetParent' && parent instanceof HTMLElement) {
            const rect = parent.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                width: parent.clientWidth,
                height: parent.clientHeight,
            };
        }

        return {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }, [referenceFrame]);

    const clampToBounds = useCallback((x: number, y: number): Point => {
        if (!clamp) return { x, y };

        const element = targetRef.current;
        const width = element?.offsetWidth ?? 0;
        const height = element?.offsetHeight ?? 0;
        const bounds = getBoundsRect();
        const minX = referenceFrame === 'viewport' ? window.scrollX || window.pageXOffset : 0;
        const minY = referenceFrame === 'viewport' ? window.scrollY || window.pageYOffset : 0;
        const maxX = minX + bounds.width - width;
        const maxY = minY + bounds.height - height;

        return {
            x: Math.min(Math.max(minX, x), maxX),
            y: Math.min(Math.max(minY, y), maxY),
        };
    }, [clamp, getBoundsRect, referenceFrame]);

    useEffect(() => {
        if (hasInitialPosition) return;

        const element = targetRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const bounds = getBoundsRect();
        const baseX = referenceFrame === 'viewport' ? window.scrollX || window.pageXOffset : 0;
        const baseY = referenceFrame === 'viewport' ? window.scrollY || window.pageYOffset : 0;
        const centered = {
            x: baseX + Math.max(0, Math.round(bounds.width / 2 - rect.width / 2)),
            y: baseY + 20,
        };

        setPosition(centered);
        positionRef.current = centered;
    }, [getBoundsRect, hasInitialPosition, referenceFrame]);

    useEffect(() => {
        if (!hasInitialPosition) return;

        const element = targetRef.current;
        if (!element) return;

        setPosition((previous) => {
            const next = clampToBounds(previous.x, previous.y);
            if (next.x === previous.x && next.y === previous.y) return previous;
            positionRef.current = next;
            return next;
        });
    }, [clampToBounds, hasInitialPosition]);

    useEffect(() => {
        const handleWindowResize = () => {
            setPosition((previous) => {
                const next = onResize ? onResize(previous) : clampToBounds(previous.x, previous.y);
                if (next.x === previous.x && next.y === previous.y) return previous;
                positionRef.current = next;
                return next;
            });
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [clampToBounds, onResize]);

    useEffect(() => {
        const handleWindowScroll = () => {
            setPosition((previous) => {
                const next = onScroll ? onScroll(previous) : clampToBounds(previous.x, previous.y);
                if (next.x === previous.x && next.y === previous.y) return previous;
                positionRef.current = next;
                return next;
            });
        };

        window.addEventListener('scroll', handleWindowScroll);
        return () => window.removeEventListener('scroll', handleWindowScroll);
    }, [clampToBounds, onScroll]);

    const onPointerDown: DraggableHandle = useCallback((event) => {
        event.preventDefault();

        const element = targetRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        dragOffsetRef.current = {
            dx: event.clientX - rect.left,
            dy: event.clientY - rect.top,
        };

        const handlePointerMove = (pointerEvent: PointerEvent) => {
            const bounds = getBoundsRect();
            const currentScrollX = window.scrollX || window.pageXOffset;
            const currentScrollY = window.scrollY || window.pageYOffset;

            let nextX = referenceFrame === 'viewport'
                ? pointerEvent.clientX + currentScrollX - dragOffsetRef.current.dx
                : pointerEvent.clientX - bounds.left - dragOffsetRef.current.dx;
            let nextY = referenceFrame === 'viewport'
                ? pointerEvent.clientY + currentScrollY - dragOffsetRef.current.dy
                : pointerEvent.clientY - bounds.top - dragOffsetRef.current.dy;

            if (axis === 'x') nextY = positionRef.current.y;
            if (axis === 'y') nextX = positionRef.current.x;

            const next = clampToBounds(nextX, nextY);
            if (next.x === positionRef.current.x && next.y === positionRef.current.y) return;
            positionRef.current = next;
            setPosition(next);
            onDrag?.(next);
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            onDragEnd?.(positionRef.current);
        };

        onDragStart?.();
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }, [axis, clampToBounds, getBoundsRect, onDrag, onDragEnd, onDragStart, referenceFrame]);

    return {
        elementRef: targetRef as RefObject<HTMLDivElement>,
        position,
        setPosition,
        handlePointerDown: onPointerDown,
        dragStyle: { left: position.x, top: position.y },
    };
};
