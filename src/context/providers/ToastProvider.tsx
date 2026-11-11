'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from 'react-icons/lu';
import {
    TOAST_DURATION_MS,
    ToastContext,
    toastReducer,
    type Toast,
    type ToastVariant,
} from '@/context/ToastContext';

const ICONS: Record<ToastVariant, ReactNode> = {
    success: <LuCircleCheck size={16} className="shrink-0 text-emerald-500" aria-hidden />,
    error: <LuCircleAlert size={16} className="shrink-0 text-red-500" aria-hidden />,
    info: <LuInfo size={16} className="shrink-0 opacity-70" aria-hidden />,
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) => {
    useEffect(() => {
        const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS[toast.variant]);
        return () => window.clearTimeout(timer);
    }, [onDismiss, toast.id, toast.variant]);

    return (
        <div
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-[min(26rem,calc(100vw-2rem))] items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
            style={{
                background: 'var(--ui-menu-card-surface)',
                borderColor: 'var(--ui-menu-border)',
                color: 'var(--ui-menu-text-strong)',
            }}
        >
            {ICONS[toast.variant]}
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Fechar aviso"
            >
                <LuX size={14} />
            </button>
        </div>
    );
};

const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, dispatch] = useReducer(toastReducer, []);
    const nextIdRef = useRef(1);

    const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
        dispatch({ type: 'add', toast: { id: nextIdRef.current++, message, variant } });
    }, []);

    const dismiss = useCallback((id: number) => dispatch({ type: 'remove', id }), []);

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
