import { useLayoutEffect } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import { useWorkspaceContext } from '../context/WorkspaceContext';
import FloatingInfoBadge from './FloatingInfoBadge';

type WorkspaceLayoutProps = {
    children: ReactNode;
    onWheel: (e: WheelEvent<HTMLElement>) => void;
    /**
     * CSS cursor value shown when neither panning nor pan-mode is active.
     * Defaults to 'default'. Examples: 'crosshair', 'text'.
     */
    defaultCursor?: string;
    /** Content for FloatingInfoBadge; omit to render no badge */
    badge?: ReactNode;
    className?: string;
};

const WorkspaceLayout = ({ children, onWheel, defaultCursor = 'default', badge, className = '' }: WorkspaceLayoutProps) => {
    const { containerRef, isCanvasPanning, isPanModeActive } = useWorkspaceContext();

    // Apply cursor via inline style so it overrides any CSS class and is inherited
    // by child SVG/canvas elements even when they hold pointer capture.
    useLayoutEffect(() => {
        if(containerRef.current) {
            let cursor: string = defaultCursor;
            if (isCanvasPanning) cursor = 'grabbing';
            else if (isPanModeActive) cursor = 'grab';

            containerRef.current.style.cursor = cursor;
        } 
    }, [containerRef, isCanvasPanning, isPanModeActive, defaultCursor]);

    return (
        <main
            ref={containerRef}
            onWheel={onWheel}
            className={`relative h-full min-h-0 w-full overflow-hidden ${className}`.trim()}
        >
            {children}
            {badge != null && <FloatingInfoBadge>{badge}</FloatingInfoBadge>}
        </main>
    );
};

export default WorkspaceLayout;
