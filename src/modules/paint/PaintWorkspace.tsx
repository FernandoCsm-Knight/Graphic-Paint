import { useContext, useEffect, useState } from 'react';
import Menu from './components/menu/main/ui/Menu'
import useCanvas from './hooks/useCanvas';
import MenuProvider from './context/providers/MenuProvider';
import { PaintContext } from './context/PaintContext';
import { ReplacementContext } from './context/ReplacementContext';
import { SettingsContext } from './context/SettingsContext';
import { useWorkspaceContext } from '../../context/WorkspaceContext';
import PageSizeEraser from './components/PageSizeEraser';
import ModeManager from './components/ModeManager';
import WorkspaceLayout from '../../components/WorkspaceLayout';

function PaintWorkspace() {
    const paintContext = useContext(PaintContext)!;
    const { canvasRef, selectedShape } = paintContext;
    const { replacementCanvasRef } = useContext(ReplacementContext)!;
    const { gridDisplayMode, pageSizeEraser } = useContext(SettingsContext)!;
    const { containerRef, zoom } = useWorkspaceContext();
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
        undo,
        redo,
        pasteSnapshot,
        copySnapshot,
        saveSnapshot
    } = useCanvas();

    useEffect(() => {
        paintContext.saveSnapshot = saveSnapshot;
    }, [paintContext, saveSnapshot]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey;
            if (!isCtrlOrMeta) return;

            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    undo();
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 'v':
                    e.preventDefault();
                    pasteSnapshot();
                    break;
                case 'c':
                    e.preventDefault();
                    copySnapshot();
                    break;
                default:
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undo, redo, pasteSnapshot, copySnapshot]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            setViewportSize({
                width: Math.round(container.clientWidth),
                height: Math.round(container.clientHeight),
            });
        };

        updateSize();

        const observer = new ResizeObserver(() => updateSize());
        observer.observe(container);

        return () => observer.disconnect();
    }, [containerRef]);

    const badge = selectedShape === 'polygon'
        ? 'Clique para adicionar vértices · Enter para finalizar · Esc para cancelar · Duplo clique para fechar'
        : `${viewportSize.width} x ${viewportSize.height} · ${Math.round(zoom * 100)}%`;

    return (
        <>
            <ModeManager />
            <MenuProvider>
                <Menu />
            </MenuProvider>
            <WorkspaceLayout
                onWheel={(e) => {
                    if ((e.target as HTMLElement).closest('[data-paint-menu]')) return;
                    handleWheel(e);
                }}
                defaultCursor={selectedShape === 'polygon' ? 'crosshair' : 'default'}
                badge={badge}
            >
                <div className="absolute inset-0 overflow-hidden">
                    <canvas
                        ref={replacementCanvasRef}
                        className={`absolute border-0 pointer-events-none inset-0 h-full w-full ${(gridDisplayMode === 'front') ? 'z-20' : 'z-0'}`}
                    ></canvas>
                    <canvas
                        ref={canvasRef}
                        className='relative z-10 block h-full w-full touch-none border-0 select-none'
                        onMouseDown={(e) => {
                            if (e.button === 1) e.preventDefault();
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    ></canvas>
                </div>
                {pageSizeEraser ? <PageSizeEraser /> : null}
            </WorkspaceLayout>
        </>
    );
};

export default PaintWorkspace
