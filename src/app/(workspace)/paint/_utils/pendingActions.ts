import type { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';

/** Callbacks a caller can attach to a pending (editable, not yet committed) shape. */
export type PendingCallbacks = {
    /** Give up the edit: restore whatever the scene had before. */
    onCancel?: (() => void) | null;
    /** Commit; when absent the pending shape itself is pushed to the scene. */
    onConfirm?: (() => void) | null;
    /** Delete the shape for good (e.g. record the removal in history). */
    onDelete?: (() => void) | null;
};

export type PendingAction = 'confirm' | 'cancel' | 'delete';

/**
 * Resolves what happens to a pending shape. Important distinction:
 * - `cancel` restores the previous scene (an existing shape comes back);
 * - `delete` discards the shape and NEVER runs `onCancel`, so a shape that
 *   was lifted from the scene for editing stays removed.
 */
export function resolvePendingAction<T extends SceneItem>(
    action: PendingAction,
    shape: T,
    callbacks: PendingCallbacks,
    pushShape: (shape: T) => void,
): void {
    switch (action) {
        case 'confirm':
            if (callbacks.onConfirm) callbacks.onConfirm();
            else pushShape(shape);
            break;
        case 'cancel':
            callbacks.onCancel?.();
            break;
        case 'delete':
            callbacks.onDelete?.();
            break;
    }
}

/**
 * Removes `selected` items from the scene for editing.
 * Returns the scene without them plus the original scene (for cancel).
 */
export function liftFromScene<T extends SceneItem>(
    scene: readonly T[],
    selected: readonly T[],
): { remaining: T[]; original: T[] } {
    const selectedSet = new Set(selected);
    return {
        remaining: scene.filter((item) => !selectedSet.has(item)),
        original: [...scene],
    };
}
