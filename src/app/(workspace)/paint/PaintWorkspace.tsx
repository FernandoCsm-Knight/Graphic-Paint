'use client';

import { useWorkspaceContext } from '@/context/WorkspaceContext';
import { useWorkspaceShell, WorkspaceShellOptions } from '@/context/WorkspaceShellContext';
import Menu from '@/app/(workspace)/paint/_components/menu/main/ui/Menu';
import ModeManager from '@/app/(workspace)/paint/_components/ModeManager';
import PageSizeEraser from '@/app/(workspace)/paint/_components/PageSizeEraser';
import { PaintContext } from '@/app/(workspace)/paint/_context/PaintContext';
import MenuProvider from '@/app/(workspace)/paint/_context/providers/MenuProvider';
import { ReplacementContext } from '@/app/(workspace)/paint/_context/ReplacementContext';
import { SettingsContext } from '@/app/(workspace)/paint/_context/SettingsContext';
import useCanvas from '@/app/(workspace)/paint/_hooks/useCanvas';
import type { PaintProjectSnapshot } from '@/lib/workspace/projectPersistence.schemas';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuLock, LuLockOpen } from 'react-icons/lu';
import { map } from './_types/Graphics';

type PaintWorkspaceProps = {
    projectId?: string;
    initialSnapshot?: PaintProjectSnapshot;
};

export default function PaintWorkspace({ projectId, initialSnapshot }: PaintWorkspaceProps) {
    const {
        canvasRef,
        selectedShape,
        pixelated,
        saveSnapshotRef,
        setPixelated,
        setCanvasSize,
    } = useContext(PaintContext)!;
    const { replacementCanvasRef } = useContext(ReplacementContext)!;
    const {
        gridDisplayMode,
        pageSizeEraser,
        pixelSize,
        setPixelSize,
        setLineAlgorithm,
        setGridDisplayMode,
        setClipAlgorithm,
        setLineDashPreset,
        setBrushStyle,
        setPlacementMode,
    } = useContext(SettingsContext)!;
    const { containerRef, zoom, setViewOffset, setZoom, setWorldSize } = useWorkspaceContext();
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const initializedRef = useRef(false);

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleWheel,
        undo,
        redo,
        pasteSnapshot,
        copySnapshot,
        saveSnapshot,
        lockButtonRef,
        handleLockClick,
    } = useCanvas({
        projectId,
        initialScene: initialSnapshot?.scene,
    });

    useEffect(() => {
        if (!initialSnapshot || initializedRef.current) return;

        setPixelated(initialSnapshot.pixelated);
        setCanvasSize({
            width: initialSnapshot.canvasWidth,
            height: initialSnapshot.canvasHeight,
        });
        setPixelSize(initialSnapshot.pixelSize);
        setLineAlgorithm(initialSnapshot.lineAlgorithm);
        setGridDisplayMode(initialSnapshot.gridDisplay);
        setClipAlgorithm(initialSnapshot.clipAlgorithm);
        setLineDashPreset(initialSnapshot.lineDash);
        setBrushStyle(initialSnapshot.brushStyle);
        setPlacementMode(initialSnapshot.placementMode);
        setWorldSize({
            width: Math.max(2400, initialSnapshot.canvasWidth),
            height: Math.max(1600, initialSnapshot.canvasHeight),
        });
        setViewOffset(initialSnapshot.viewOffset);
        setZoom(initialSnapshot.zoom);

        initializedRef.current = true;
    }, [
        initialSnapshot,
        setBrushStyle,
        setCanvasSize,
        setClipAlgorithm,
        setGridDisplayMode,
        setLineAlgorithm,
        setLineDashPreset,
        setPixelSize,
        setPixelated,
        setPlacementMode,
        setViewOffset,
        setWorldSize,
        setZoom,
    ]);

    useEffect(() => {
        saveSnapshotRef.current = saveSnapshot;

        return () => {
            if (saveSnapshotRef.current === saveSnapshot) {
                saveSnapshotRef.current = null;
            }
        };
    }, [saveSnapshot, saveSnapshotRef]);

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

    let badge: string;
    if (selectedShape === 'polygon') {
        badge = 'Clique para adicionar vértices · Enter para finalizar · Esc para cancelar · Duplo clique para fechar';
    } else if (pixelated) {
        const mapped = map({ x: viewportSize.width, y: viewportSize.height }, pixelSize);
        badge = `${mapped.x} x ${mapped.y} · ${Math.round(zoom * 100)}%`;
    } else {
        badge = `${viewportSize.width} x ${viewportSize.height} · ${Math.round(zoom * 100)}%`;
    }

    const shellOptions = useMemo<WorkspaceShellOptions>(() => ({
        onWheel: (event) => {
            if ((event.target as HTMLElement).closest('[data-paint-menu]')) return;
            handleWheel(event);
        },
        defaultCursor: selectedShape === 'polygon' ? 'crosshair' : 'default',
        badge,
    }), [badge, handleWheel, selectedShape]);

    useWorkspaceShell(shellOptions);

    return (
        <>
            <ModeManager />
            <MenuProvider>
                <Menu />
            </MenuProvider>
            <div className="absolute inset-0 overflow-hidden">
                <canvas
                    ref={replacementCanvasRef}
                    className={`absolute border-0 pointer-events-none inset-0 h-full w-full ${gridDisplayMode === 'front' ? 'z-20' : 'z-0'}`}
                />
                <canvas
                    ref={canvasRef}
                    className="relative z-10 block h-full w-full touch-none border-0 select-none"
                    onMouseDown={(e) => {
                        if (e.button === 1) e.preventDefault();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                />
                <button
                    ref={lockButtonRef}
                    onClick={handleLockClick}
                    title="Agrupar / Desagrupar"
                    style={{ display: 'none', position: 'absolute', transform: 'translate(-50%, -50%)' }}
                    className="z-30 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md cursor-pointer"
                >
                    <span data-icon="locked" style={{ display: 'none' }}><LuLock size={14} /></span>
                    <span data-icon="unlocked"><LuLockOpen size={14} /></span>
                </button>
            </div>
            {pageSizeEraser ? <PageSizeEraser /> : null}
        </>
    );
}
