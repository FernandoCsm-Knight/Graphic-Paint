import { describe, expect, it } from 'vitest';
import type { Point } from '@/types/geometry';
import FreeForm from '@/app/(workspace)/paint/_shapes/FreeForm';
import { deserializePaintScene, serializePaintScene } from '@/app/(workspace)/paint/_utils/scenePersistence';
import { mulberry32, sprayDots } from './Spray';

/** Records fillRect calls (the only drawing primitive used by the spray). */
function recordingCtx() {
    const rects: number[][] = [];
    const ctx = {
        globalCompositeOperation: 'source-over',
        fillStyle: '',
        strokeStyle: '',
        fillRect: (...args: number[]) => rects.push(args),
    } as unknown as CanvasRenderingContext2D;
    return { ctx, rects };
}

function spray(points: Point[], seed: number) {
    return new FreeForm(points.map((p) => ({ ...p })), {
        strokeStyle: '#000000',
        lineWidth: 4,
        isEraser: false,
        brushStyle: 'spray',
        seed,
    });
}

const path: Point[] = [{ x: 10, y: 10 }, { x: 20, y: 15 }, { x: 35, y: 18 }, { x: 50, y: 30 }];

describe('mulberry32', () => {
    it('gera a mesma sequência para a mesma semente', () => {
        const a = mulberry32(42);
        const b = mulberry32(42);
        const seqA = Array.from({ length: 5 }, a);
        expect(Array.from({ length: 5 }, b)).toEqual(seqA);
        expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
    });

    it('gera sequências diferentes para sementes diferentes', () => {
        expect(mulberry32(1)()).not.toBe(mulberry32(2)());
    });
});

describe('sprayDots', () => {
    it('é determinístico por semente e índice', () => {
        expect(sprayDots({ x: 0, y: 0 }, 3, 99, 4)).toEqual(sprayDots({ x: 0, y: 0 }, 3, 99, 4));
        expect(sprayDots({ x: 0, y: 0 }, 3, 99, 4)).not.toEqual(sprayDots({ x: 0, y: 0 }, 4, 99, 4));
    });

    it('mantém os pontos dentro do raio do pincel', () => {
        const dots = sprayDots({ x: 100, y: 100 }, 0, 7, 4);
        expect(dots).toHaveLength(12);
        expect(dots.every((d) => Math.hypot(d.x - 100, d.y - 100) <= 10)).toBe(true);
    });
});

describe('spray do FreeForm', () => {
    it('desenho ao vivo e replay produzem exatamente os mesmos pontos', () => {
        const live = recordingCtx();
        const stroke = spray([path[0]], 1234);
        stroke.draw(live.ctx); // pointer down
        for (const p of path.slice(1)) stroke.lineTo({ ...p }, live.ctx); // pointer moves

        const replay = recordingCtx();
        spray(path, 1234).draw(replay.ctx);

        expect(replay.rects).toEqual(live.rects);
        expect(live.rects.length).toBeGreaterThan(0);
    });

    it('duas execuções de replay com a mesma semente são iguais', () => {
        const first = recordingCtx();
        const second = recordingCtx();
        spray(path, 77).draw(first.ctx);
        spray(path, 77).draw(second.ctx);
        expect(second.rects).toEqual(first.rects);
    });

    it('a semente sobrevive a salvar e recarregar', async () => {
        const original = spray(path, 555);
        const [restored] = await deserializePaintScene(await serializePaintScene([original]));
        expect((restored as FreeForm).seed).toBe(555);

        const a = recordingCtx();
        const b = recordingCtx();
        original.draw(a.ctx);
        restored.draw(b.ctx);
        expect(b.rects).toEqual(a.rects);
    });

    it('projetos antigos sem semente usam semente fixa', async () => {
        const [restored] = await deserializePaintScene([
            { position: 0, kind: 'freeform', data: { points: path, brushStyle: 'spray', lineWidth: 4 } },
        ]);
        expect((restored as FreeForm).seed).toBe(0);
    });
});
