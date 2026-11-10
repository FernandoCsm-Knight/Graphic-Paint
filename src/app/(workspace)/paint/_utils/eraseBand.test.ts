import { describe, expect, it } from 'vitest';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import { eraseBandToRect, mergeEraseBands } from './eraseBand';
import { deserializePaintScene, serializePaintScene } from './scenePersistence';

describe('eraseBand', () => {
    it('une as faixas apagadas durante o arraste', () => {
        let band = mergeEraseBands(null, { top: 500, bottom: 800 });
        band = mergeEraseBands(band, { top: 300, bottom: 800 });
        band = mergeEraseBands(band, { top: 450, bottom: 800 });
        expect(band).toEqual({ top: 300, bottom: 800 });
    });

    it('gera retângulo com a largura total do documento', () => {
        expect(eraseBandToRect({ top: 300, bottom: 800 }, 2400)).toEqual({ x: 0, y: 300, w: 2400, h: 500 });
    });

    it('não gera retângulo para faixa vazia', () => {
        expect(eraseBandToRect(null, 2400)).toBeNull();
        expect(eraseBandToRect({ top: 300, bottom: 300 }, 2400)).toBeNull();
    });
});

describe('apagar página persiste', () => {
    it('cena com apagar página volta igual após salvar e recarregar', async () => {
        const rect = eraseBandToRect({ top: 120, bottom: 1600 }, 2400)!;
        const scene = [
            new Line({ x: 0, y: 0 }, { x: 100, y: 1000 }, { strokeStyle: '#000000' }),
            new ClearRectItem(rect.x, rect.y, rect.w, rect.h),
        ];

        const saved = await serializePaintScene(scene);
        const restored = await deserializePaintScene(saved);

        expect(restored).toHaveLength(2);
        expect(restored[1]).toBeInstanceOf(ClearRectItem);
        const clear = restored[1] as ClearRectItem;
        expect({ x: clear.x, y: clear.y, w: clear.w, h: clear.h }).toEqual(rect);
        expect(await serializePaintScene(restored)).toEqual(saved);
    });
});
