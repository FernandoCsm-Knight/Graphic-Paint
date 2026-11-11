import { createContext, useContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type Toast = {
    id: number;
    message: string;
    variant: ToastVariant;
};

export type ToastContextType = {
    /** Shows a non-blocking notification that disappears on its own. */
    showToast: (message: string, variant?: ToastVariant) => void;
};

/** Without a provider, toasts are silently ignored (never crash a workspace). */
export const ToastContext = createContext<ToastContextType>({
    showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

/** Maximum toasts on screen; older ones are dropped first. */
export const MAX_VISIBLE_TOASTS = 3;

export const TOAST_DURATION_MS: Record<ToastVariant, number> = {
    success: 2_500,
    info: 3_000,
    error: 5_000,
};

export type ToastAction =
    | { type: 'add'; toast: Toast }
    | { type: 'remove'; id: number };

export function toastReducer(state: Toast[], action: ToastAction): Toast[] {
    switch (action.type) {
        case 'add':
            return [...state, action.toast].slice(-MAX_VISIBLE_TOASTS);
        case 'remove':
            return state.filter((toast) => toast.id !== action.id);
        default:
            return state;
    }
}
