import { describe, expect, it } from 'vitest';
import { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import { drawRedoItem, findLastCheckpointIndex, replayScene } from './sceneReplay';

type Cell = string | null;

/**
 * Minimal raster "canvas": a grid of cells. Only the operations used by the
 * replay helpers (clearRect + drawing via scene items) are modelled.
 */
class FakeCanvas {
    cells: Cell[][];
    constructor(public width: number, public height: number) {
        this.cells = Array.from({ length: height }, () => Array<Cell>(width).fill(null));
    }
    grow(width: number, height: number) {
        const next = new FakeCanvas(width, height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) next.cells[y][x] = this.cells[y][x];
        }
        Object.assign(this, { width, height, cells: next.cells });
    }
    snapshot(): Cell[][] {
        return this.cells.map((row) => [...row]);
    }
}

function makeCtx(canvas: FakeCanvas) {
    return {
        canvas,
        clearRect(x: number, y: number, w: number, h: number) {
            for (let yy = y; yy < Math.min(canvas.height, y + h); yy++) {
                for (let xx = x; xx < Math.min(canvas.width, x + w); xx++) canvas.cells[yy][xx] = null;
            }
        },
    } as unknown as CanvasRenderingContext2D;
}

function canvasOf(ctx: CanvasRenderingContext2D) {
    return ctx.canvas as unknown as FakeCanvas;
}

class Dot extends SceneItem {
    constructor(private x: number, private y: number, private color = 'x') { super(); }
    draw(ctx: CanvasRenderingContext2D) {
        canvasOf(ctx).cells[this.y][this.x] = this.color;
    }
}

/** Behaves like RasterCheckpoint/FreeForm: putImageData of a fixed-size bitmap at (0,0). */
class Checkpoint extends SceneItem {
    constructor(private data: Cell[][]) { super(); }
    draw(ctx: CanvasRenderingContext2D) {
        const canvas = canvasOf(ctx);
        this.data.forEach((row, y) => row.forEach((cell, x) => {
            if (y < canvas.height && x < canvas.width) canvas.cells[y][x] = cell;
        }));
    }
    override isCheckpoint() { return true; }
}

describe('sceneReplay', () => {
    it('encontra o último checkpoint', () => {
        expect(findLastCheckpointIndex([new Dot(0, 0)])).toBe(-1);
        expect(findLastCheckpointIndex([new Checkpoint([]), new Dot(0, 0), new Checkpoint([]), new Dot(1, 1)])).toBe(2);
    });

    it('limpa o canvas quando a cena está vazia', () => {
        const canvas = new FakeCanvas(3, 3);
        canvas.cells[1][1] = 'lixo';
        replayScene([], makeCtx(canvas));
        expect(canvas.cells.flat().every((c) => c === null)).toBe(true);
    });

    it('desfazer após o canvas crescer não deixa sobras fora do checkpoint', () => {
        const canvas = new FakeCanvas(2, 2);
        const ctx = makeCtx(canvas);

        // Traço inicial vira checkpoint do canvas 2x2.
        new Dot(0, 0).draw(ctx);
        const scene: SceneItem[] = [new Checkpoint(canvas.snapshot())];

        // Canvas cresce e um traço é feito na área nova.
        canvas.grow(4, 4);
        const strokeInNewArea = new Dot(3, 3, 'novo');
        scene.push(strokeInNewArea);
        strokeInNewArea.draw(ctx);

        // Desfazer: remove o traço e redesenha a cena.
        scene.pop();
        replayScene(scene, ctx);

        expect(canvas.cells[3][3]).toBeNull();
        expect(canvas.cells[0][0]).toBe('x');
    });

    it('redesenha somente a partir do último checkpoint', () => {
        const canvas = new FakeCanvas(3, 1);
        const ctx = makeCtx(canvas);
        const scene = [new Dot(0, 0, 'a'), new Checkpoint([['b', null, null]]), new Dot(2, 0, 'c')];

        replayScene(scene, ctx);

        expect(canvas.cells[0]).toEqual(['b', null, 'c']);
    });

    it('refazer um checkpoint substitui o bitmap inteiro', () => {
        const canvas = new FakeCanvas(4, 1);
        const ctx = makeCtx(canvas);
        canvas.cells[0][3] = 'sobra';

        drawRedoItem(new Checkpoint([['k', null]]), ctx);

        expect(canvas.cells[0]).toEqual(['k', null, null, null]);
    });

    it('refazer um item vetorial desenha por cima sem limpar', () => {
        const canvas = new FakeCanvas(2, 1);
        const ctx = makeCtx(canvas);
        canvas.cells[0][0] = 'existente';

        drawRedoItem(new Dot(1, 0, 'novo'), ctx);

        expect(canvas.cells[0]).toEqual(['existente', 'novo']);
    });
});
