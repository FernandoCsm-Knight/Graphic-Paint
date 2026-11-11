import type { SceneItem } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import { applyCheckpointInterval, CHECKPOINT_INTERVAL, MAX_UNDO_STEPS } from './sceneHistory';
import { findLastCheckpointIndex } from './sceneReplay';

/**
 * One undoable change to the scene.
 * - `push`: an item appended at the end (strokes, new shapes).
 * - `replace`: any other change (edit/delete/group/ungroup existing items),
 *   stored as the scene before and after (arrays of references — cheap).
 */
export type SceneOperation =
    | { type: 'push'; item: SceneItem }
    | { type: 'replace'; before: SceneItem[]; after: SceneItem[] };

/**
 * Builds a new scene where each item in `mapping` is replaced in place by its
 * replacement list (empty list = delete). Items keep their drawing order.
 */
export function replaceItemsInPlace(
    scene: readonly SceneItem[],
    mapping: ReadonlyMap<SceneItem, readonly SceneItem[]>,
): SceneItem[] {
    return scene.flatMap((item) => (mapping.has(item) ? [...mapping.get(item)!] : [item]));
}

function sameItems(a: readonly SceneItem[], b: readonly SceneItem[]): boolean {
    return a.length === b.length && a.every((item, i) => item === b[i]);
}

function firstDifference(a: readonly SceneItem[], b: readonly SceneItem[]): number {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
        if (a[i] !== b[i]) return i;
    }
    return length;
}

function removeLast(scene: SceneItem[], item: SceneItem): SceneItem[] {
    const index = scene.lastIndexOf(item);
    if (index === -1) return scene;
    return [...scene.slice(0, index), ...scene.slice(index + 1)];
}

/** Scene state before `op` was applied, given the state after it. */
function stateBefore(after: SceneItem[], op: SceneOperation): SceneItem[] {
    return op.type === 'push' ? removeLast(after, op.item) : op.before;
}

/**
 * Scene items plus operation-based undo/redo history. Pure (no canvas):
 * callers redraw after `undo`/`redo`/`replace`.
 */
export class SceneHistory {
    private current: SceneItem[] = [];
    private undoStack: SceneOperation[] = [];
    private redoStack: SceneOperation[] = [];

    constructor(
        private readonly maxSteps = MAX_UNDO_STEPS,
        private readonly checkpointInterval = CHECKPOINT_INTERVAL,
    ) {}

    get scene(): SceneItem[] {
        return this.current;
    }

    get undoDepth(): number {
        return this.undoStack.length;
    }

    get redoDepth(): number {
        return this.redoStack.length;
    }

    /** Appends an item (one undo step). */
    push(item: SceneItem): void {
        this.current.push(item);
        applyCheckpointInterval(this.current, this.checkpointInterval);
        this.record({ type: 'push', item });
    }

    /**
     * Replaces the scene with `after` as one undo step. `before` defaults to
     * the current scene; pass the original scene when the current one is a
     * transient editing state (an item lifted out for editing).
     */
    replace(after: readonly SceneItem[], before: readonly SceneItem[] = this.current): void {
        const previous = [...before];
        const next = [...after];
        this.current = next;
        if (sameItems(previous, next)) return;

        // Bitmaps of checkpoints at/after the first change may contain pixels
        // of removed or edited items: drop them (items replay from vector data).
        const changedFrom = firstDifference(previous, next);
        for (let i = changedFrom; i < next.length; i++) {
            if (next[i].isCheckpoint()) next[i].releaseSnapshot(true);
        }

        this.record({ type: 'replace', before: previous, after: next });
    }

    /** Sets the scene without touching history (lift for editing / cancel). */
    setTransient(next: readonly SceneItem[]): void {
        this.current = [...next];
    }

    /** Replaces everything and clears history (e.g. after loading a project). */
    reset(items: readonly SceneItem[]): void {
        this.current = [...items];
        this.undoStack = [];
        this.redoStack = [];
    }

    /** Undoes the last operation; returns it, or null when nothing to undo. */
    undo(): SceneOperation | null {
        const op = this.undoStack.pop();
        if (!op) return null;
        this.current = stateBefore(this.current, op);
        this.redoStack.push(op);
        return op;
    }

    /** Redoes the last undone operation; returns it, or null. */
    redo(): SceneOperation | null {
        const op = this.redoStack.pop();
        if (!op) return null;
        this.current = op.type === 'push' ? [...this.current, op.item] : [...op.after];
        this.undoStack.push(op);
        return op;
    }

    private record(op: SceneOperation): void {
        this.undoStack.push(op);
        this.redoStack = [];
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.releaseUnreachableCheckpoints();
    }

    /**
     * Keeps only the snapshots that can start a replay: the last checkpoint of
     * each state reachable through undo. Everything else is released (all
     * items replay exactly from vector data, so this only affects speed).
     */
    private releaseUnreachableCheckpoints(): void {
        const states: SceneItem[][] = [this.current];
        let state = this.current;
        for (let i = this.undoStack.length - 1; i >= 0; i--) {
            state = stateBefore(state, this.undoStack[i]);
            states.push(state);
        }

        const needed = new Set<SceneItem>();
        for (const s of states) {
            const index = findLastCheckpointIndex(s);
            if (index !== -1) needed.add(s[index]);
        }

        const seen = new Set<SceneItem>();
        for (const s of states) {
            for (const item of s) {
                if (seen.has(item)) continue;
                seen.add(item);
                if (item.isCheckpoint() && !needed.has(item)) item.releaseSnapshot(true);
            }
        }
    }
}
