import { useContext, useEffect } from 'react';
import Menu from './components/Menu'
import useCanvas from './hooks/useCanvas';
import MenuProvider from './providers/MenuProvider';
import { PaintContext } from './context/PaintContext';
import { ReplacementContext } from './context/ReplacementContext';
import { SettingsContext } from './context/SettingsContext';

function App() {
    const { canvasRef, containerRef, isSelectionActive } = useContext(PaintContext)!;
    const { replacementCanvasRef } = useContext(ReplacementContext)!;
    const { gridDisplayMode } = useContext(SettingsContext)!;

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        undo,
        redo,
        pasteSnapshot,
        copySnapshot
    } = useCanvas();

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

    return (
        <>
            <MenuProvider>
                <Menu />
            </MenuProvider>
            <main ref={containerRef} className='h-full w-full relative'>
                <canvas
                    ref={replacementCanvasRef}
                    className={`absolute border-0 pointer-events-none top-0 left-0 ${(gridDisplayMode === 'front' || isSelectionActive) ? 'z-20' : 'z-0'}`}
                ></canvas>
                <canvas
                    ref={canvasRef}
                    className='relative border-0 z-10'
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                ></canvas>
            </main>
        </>
    );
};

export default App
