import Menu from './components/Menu'
import useCanvas from './hooks/useCanvas';
import { useEffect } from 'react';

function App() {
  const {
    canvasRef,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    updateColor,
    updateLineWidth,
    undo,
    redo,
  } = useCanvas();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      if(e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if(e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return (
    <>
      <Menu 
        onColorChanged={updateColor}
        onLineWidthChange={updateLineWidth}
      />
      <main ref={containerRef} className='h-full w-full flex items-center justify-center'>
        <canvas  
          id="board" 
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ border: '1px solid #ccc' }}
        ></canvas>
      </main>
    </>
  );
};

export default App
