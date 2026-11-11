import { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function copyValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(copyValue);
    if (value instanceof SceneItem) return cloneSceneItem(value);
    if (isPlainObject(value)) {
        const copy: Record<string, unknown> = {};
        for (const [key, inner] of Object.entries(value)) copy[key] = copyValue(inner);
        return copy;
    }
    // Primitives and platform objects (images, canvases, ImageData) are shared:
    // editing never mutates them in place.
    return value;
}

/**
 * Deep copy of a scene item (same class), so an existing shape can be edited
 * while the original stays intact for cancel/undo. Points, transform frames
 * and group children are copied; images and raster snapshots are shared.
 */
export function cloneSceneItem<T extends SceneItem>(item: T): T {
    const copy = Object.create(Object.getPrototypeOf(item)) as T;
    for (const key of Object.keys(item)) {
        (copy as Record<string, unknown>)[key] = copyValue((item as Record<string, unknown>)[key]);
    }
    return copy;
}
