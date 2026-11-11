import { describe, expect, it } from 'vitest';
import { isTypingTarget } from './isTypingTarget';

const el = (props: Record<string, unknown>) => props as unknown as EventTarget;

describe('isTypingTarget', () => {
    it('reconhece campos de texto', () => {
        expect(isTypingTarget(el({ tagName: 'INPUT', type: 'text' }))).toBe(true);
        expect(isTypingTarget(el({ tagName: 'INPUT', type: 'number' }))).toBe(true);
        expect(isTypingTarget(el({ tagName: 'INPUT' }))).toBe(true);
        expect(isTypingTarget(el({ tagName: 'TEXTAREA' }))).toBe(true);
        expect(isTypingTarget(el({ tagName: 'SELECT' }))).toBe(true);
        expect(isTypingTarget(el({ tagName: 'DIV', isContentEditable: true }))).toBe(true);
    });

    it('ignora inputs que não recebem texto', () => {
        expect(isTypingTarget(el({ tagName: 'INPUT', type: 'range' }))).toBe(false);
        expect(isTypingTarget(el({ tagName: 'INPUT', type: 'checkbox' }))).toBe(false);
        expect(isTypingTarget(el({ tagName: 'INPUT', type: 'color' }))).toBe(false);
    });

    it('ignora outros elementos e alvos vazios', () => {
        expect(isTypingTarget(el({ tagName: 'CANVAS' }))).toBe(false);
        expect(isTypingTarget(el({ tagName: 'BUTTON' }))).toBe(false);
        expect(isTypingTarget(el({ tagName: 'DIV', isContentEditable: false }))).toBe(false);
        expect(isTypingTarget(null)).toBe(false);
    });
});
