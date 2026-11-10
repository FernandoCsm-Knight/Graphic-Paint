import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Autosaver, KEEPALIVE_MAX_BYTES, type SaveStatus } from './autosave';

function setup(results: boolean[] = []) {
    const calls: { body: string; keepalive: boolean }[] = [];
    const statuses: SaveStatus[] = [];
    const send = vi.fn(async (body: string, options: { keepalive: boolean }) => {
        calls.push({ body, keepalive: options.keepalive });
        return results.length ? results.shift()! : true;
    });
    const saver = new Autosaver({
        send,
        debounceMs: 100,
        retryDelaysMs: [1_000, 5_000],
        onStatusChange: (status) => statuses.push(status),
    });
    return { saver, calls, statuses, send };
}

const payload = (value: string) => async () => value;

describe('Autosaver', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('espera o debounce e salva só o estado mais recente', async () => {
        const { saver, calls, statuses } = setup();
        saver.schedule(payload('a'));
        saver.schedule(payload('b'));
        expect(calls).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(100);

        expect(calls.map((c) => c.body)).toEqual(['b']);
        expect(statuses).toEqual(['saving', 'saved']);
        expect(saver.hasUnsavedChanges()).toBe(false);
    });

    it('não reenvia payload idêntico', async () => {
        const { saver, calls } = setup();
        saver.schedule(payload('a'));
        await vi.advanceTimersByTimeAsync(100);
        saver.schedule(payload('a'));
        await vi.advanceTimersByTimeAsync(100);
        expect(calls).toHaveLength(1);
        expect(saver.getStatus()).toBe('saved');
    });

    it('marca erro e tenta de novo com backoff', async () => {
        const { saver, calls, statuses } = setup([false, false, true]);
        saver.schedule(payload('a'));

        await vi.advanceTimersByTimeAsync(100);
        expect(saver.getStatus()).toBe('error');
        expect(saver.hasUnsavedChanges()).toBe(true);

        await vi.advanceTimersByTimeAsync(999);
        expect(calls).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(calls).toHaveLength(2);

        await vi.advanceTimersByTimeAsync(5_000);
        expect(calls).toHaveLength(3);
        expect(saver.getStatus()).toBe('saved');
        expect(statuses.at(-1)).toBe('saved');
    });

    it('trata exceção do envio como falha', async () => {
        const saver = new Autosaver({
            send: async () => { throw new Error('rede'); },
            debounceMs: 10,
            retryDelaysMs: [1_000],
        });
        saver.schedule(payload('a'));
        await vi.advanceTimersByTimeAsync(10);
        expect(saver.getStatus()).toBe('error');
        saver.dispose();
    });

    it('flush salva na hora e usa keepalive só para payload pequeno', async () => {
        const { saver, calls } = setup();
        saver.schedule(payload('pequeno'));
        await saver.flush({ keepalive: true });
        expect(calls[0]).toEqual({ body: 'pequeno', keepalive: true });

        const big = 'x'.repeat(KEEPALIVE_MAX_BYTES + 1);
        saver.schedule(payload(big));
        await saver.flush({ keepalive: true });
        expect(calls[1].keepalive).toBe(false);
    });

    it('mudança feita durante um envio é salva em seguida', async () => {
        let release!: (ok: boolean) => void;
        const bodies: string[] = [];
        const saver = new Autosaver({
            send: (body) => {
                bodies.push(body);
                return bodies.length === 1 ? new Promise<boolean>((r) => { release = r; }) : Promise.resolve(true);
            },
            debounceMs: 10,
        });

        saver.schedule(payload('a'));
        await vi.advanceTimersByTimeAsync(10);
        expect(saver.getStatus()).toBe('saving');

        saver.schedule(payload('b'));
        await vi.advanceTimersByTimeAsync(10);
        release(true);
        await vi.advanceTimersByTimeAsync(0);

        expect(bodies).toEqual(['a', 'b']);
        expect(saver.getStatus()).toBe('saved');
    });

    it('dispose cancela o salvamento agendado', async () => {
        const { saver, calls } = setup();
        saver.schedule(payload('a'));
        saver.dispose();
        await vi.advanceTimersByTimeAsync(1_000);
        expect(calls).toHaveLength(0);
    });
});
