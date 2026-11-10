import { describe, expect, it } from 'vitest';
import { MAX_VISIBLE_TOASTS, toastReducer, type Toast } from './ToastContext';

const toast = (id: number): Toast => ({ id, message: `aviso ${id}`, variant: 'info' });

describe('toastReducer', () => {
    it('adiciona e remove avisos', () => {
        let state = toastReducer([], { type: 'add', toast: toast(1) });
        state = toastReducer(state, { type: 'add', toast: toast(2) });
        expect(state.map((t) => t.id)).toEqual([1, 2]);

        state = toastReducer(state, { type: 'remove', id: 1 });
        expect(state.map((t) => t.id)).toEqual([2]);
    });

    it('mantém no máximo MAX_VISIBLE_TOASTS, descartando os mais antigos', () => {
        let state: Toast[] = [];
        for (let i = 1; i <= MAX_VISIBLE_TOASTS + 2; i++) {
            state = toastReducer(state, { type: 'add', toast: toast(i) });
        }
        expect(state).toHaveLength(MAX_VISIBLE_TOASTS);
        expect(state[0].id).toBe(3);
    });
});
