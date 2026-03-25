'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { SubmitEvent, useState } from 'react';
import { LuArrowRight, LuKeyRound, LuMail } from 'react-icons/lu';
import AuthShell from '@/components/AuthShell';
import {
    authErrorMessages,
    getValidationMessage,
    sanitizeNextPath,
    signInSchema,
} from '@/lib/auth/validation';

function resolveGuestPath(nextPath: string) {
    return nextPath === '/paint' || nextPath === '/graph' || nextPath === '/automaton'
        ? nextPath
        : '/paint';
}

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = sanitizeNextPath(searchParams.get('next'), '/dashboard');
    const guestPath = resolveGuestPath(nextPath);
    const searchError = searchParams.get('error');
    const feedbackError = error ?? (searchError && searchError in authErrorMessages
        ? authErrorMessages[searchError as keyof typeof authErrorMessages]
        : null);

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const parsed = signInSchema.safeParse({
            email: form.get('email'),
            password: form.get('password'),
        });

        if (!parsed.success) {
            setError(getValidationMessage(parsed.error));
            setLoading(false);
            return;
        }

        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...parsed.data,
                next: nextPath,
            }),
        });

        const result = await response.json() as { error?: string; redirectTo?: string };

        if (!response.ok || result.error) {
            setError(result.error ?? 'Nao foi possivel entrar agora.');
            setLoading(false);
            return;
        }

        router.replace(result.redirectTo ?? nextPath);
        router.refresh();
    }

    return (
        <AuthShell
            badge="Entrar"
            title="Acesse sua workspace e continue exatamente de onde parou."
            description="Projetos, modulos e exploracoes ficam no mesmo sistema visual. O login agora acompanha a mesma presenca da nova landing."
            activeModuleId="paint"
        >
            <div className="rounded-[1.6rem] border p-5 sm:p-6" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                <div className="mb-6">
                    <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                        Entrar
                    </p>
                    <h1 className="theme-sidebar-title mt-3 text-3xl font-black tracking-[-0.03em]">
                        Bem-vindo de volta
                    </h1>
                    <p className="theme-sidebar-copy mt-3 text-sm leading-7">
                        Entre para abrir seus projetos, navegar pelos modulos e continuar o fluxo sem sair da mesma identidade do produto.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2">
                        <span className="theme-sidebar-copy-muted text-xs font-semibold uppercase tracking-[0.22em]">
                            E-mail
                        </span>
                        <div className="ui-input flex items-center gap-3 rounded-2xl px-4 py-3">
                            <LuMail className="theme-sidebar-copy-muted h-4 w-4 shrink-0" />
                            <input
                                type="email"
                                name="email"
                                required
                                autoComplete="email"
                                placeholder="voce@exemplo.com"
                                className="min-w-0 grow bg-transparent text-sm outline-none"
                            />
                        </div>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="theme-sidebar-copy-muted text-xs font-semibold uppercase tracking-[0.22em]">
                            Senha
                        </span>
                        <div className="ui-input flex items-center gap-3 rounded-2xl px-4 py-3">
                            <LuKeyRound className="theme-sidebar-copy-muted h-4 w-4 shrink-0" />
                            <input
                                type="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                placeholder="Sua senha"
                                className="min-w-0 grow bg-transparent text-sm outline-none"
                            />
                        </div>
                    </label>

                    {feedbackError ? (
                        <div
                            className="rounded-2xl border px-4 py-3 text-sm"
                            style={{
                                borderColor: 'color-mix(in srgb, #f87171 45%, transparent)',
                                background: 'color-mix(in srgb, #f87171 12%, transparent)',
                                color: '#fecaca',
                            }}
                        >
                            {feedbackError}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="module-card-button mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                        style={{
                            background: 'var(--app-accent-text)',
                            color: 'var(--ui-menu-card-surface)',
                        }}
                    >
                        {loading ? 'Entrando...' : 'Entrar na workspace'}
                        <LuArrowRight className="h-4 w-4" />
                    </button>
                </form>

                <div
                    className="mt-6 rounded-2xl border px-4 py-4"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 80%, transparent)',
                        background: 'color-mix(in srgb, var(--app-sidebar-surface) 55%, transparent)',
                    }}
                >
                    <p className="theme-sidebar-copy text-sm leading-7">
                        Ainda nao tem conta?{' '}
                        <Link
                            href={nextPath === '/dashboard' ? '/register' : `/register?next=${encodeURIComponent(nextPath)}`}
                            className="font-semibold underline"
                            style={{ color: 'var(--app-accent-text)' }}
                        >
                            Criar conta
                        </Link>
                    </p>
                </div>

                <div
                    className="mt-4 rounded-2xl border px-4 py-4"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--app-accent-border) 70%, transparent)',
                        background: 'color-mix(in srgb, var(--app-accent-soft) 38%, transparent)',
                    }}
                >
                    <p className="theme-sidebar-title text-sm font-semibold">
                        Prefere testar primeiro?
                    </p>
                    <p className="theme-sidebar-copy mt-2 text-sm leading-7">
                        Entre como convidado para usar o modulo sem dashboard e sem salvamento online.
                    </p>
                    <Link
                        href={guestPath}
                        className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                        style={{
                            border: '1px solid var(--app-accent-border)',
                            color: 'var(--app-accent-text)',
                        }}
                    >
                        Continuar como convidado
                        <LuArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </AuthShell>
    );
}
