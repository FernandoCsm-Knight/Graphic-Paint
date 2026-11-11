/** <input> types that do not take text, so global shortcuts should still work on them. */
const NON_TEXT_INPUT_TYPES = new Set([
    'button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit',
]);

type MaybeEditable = {
    tagName?: unknown;
    type?: unknown;
    isContentEditable?: unknown;
};

/**
 * True when a keyboard event target is a place where the user is typing
 * (text inputs, textareas, selects, contentEditable). Global shortcuts such
 * as Ctrl+Z/C/V or Delete/Backspace must be ignored there.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    if (!target || typeof target !== 'object') return false;

    const element = target as MaybeEditable;
    if (element.isContentEditable === true) return true;

    const tagName = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';
    if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
    if (tagName === 'INPUT') {
        const type = typeof element.type === 'string' ? element.type.toLowerCase() : 'text';
        return !NON_TEXT_INPUT_TYPES.has(type);
    }

    return false;
}
