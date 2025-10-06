import { useState } from "react";

const useHistory = <T>(limit: number) => {
    if(!Number.isInteger(limit) || limit <= 0) {
        throw new Error("The limit must be a positive integer.");
    }

    const [history, setHistory] = useState<T[]>([]);
    const [redoStack, setRedoStack] = useState<T[]>([]);

    const push = (element: T) => {
        setHistory((prev) => {
            if(prev.length >= limit) prev.shift();
            return [...prev, element];
        });
        setRedoStack([]);
    };

    const undo = (): { removed: T | null, current: T | null } => {
        let removed: T | null = null;
        let current: T | null = null;

        if(history.length !== 0) {
            const newHistory = [...history];
            removed = newHistory.pop()!;
            current = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
            setHistory(newHistory);
            setRedoStack((prev) => removed ? [...prev, removed] : prev);
        }

        return { removed, current };
    }

    const redo = (): T | null => {
        let last: T | null = null;

        if(redoStack.length !== 0) {
            const newRedoStack = [...redoStack];
            last = newRedoStack.pop()!;
            setRedoStack(newRedoStack);
            setHistory((prev) => last ? [...prev, last] : prev);
        }

        return last;
    }

    const last = () => {
        return history.length > 0 ? history[history.length - 1] : null;
    };

    const clear = () => {
        setHistory([]);
        setRedoStack([]);
    };

    return {
        push: push,
        undo: undo,
        redo: redo,
        last: last,
        clear: clear,
        history: history
    };
};

export default useHistory;