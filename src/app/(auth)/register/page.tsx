'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { SubmitEvent, useState } from 'react';
import { LuArrowRight, LuKeyRound, LuMail, LuMailCheck } from 'react-icons/lu';
import AuthShell from '@/components/AuthShell';
import {
    getValidationMessage,
    sanitizeNextPath,
    signUpSchema,
} from '@/lib/auth/validation';

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = sanitizeNextPath(searchParams.get('next'), '/dashboard');

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const parsed = signUpSchema.safeParse({
            email: form.get('email'),
            password: form.get('password'),
        });

        if (!parsed.success) {
            setError(getValidationMessage(parsed.error));
            setLoading(false);
            return;
        }

        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...parsed.data,
                next: nextPath,
            }),
        });

        const result = await response.json() as { error?: string; success?: boolean; redirectTo?: string };

        if (!response.ok || result.error) {
            setError(result.error ?? 'Nao foi possivel criar sua conta agora.');
            setLoading(false);
        } else if (result.redirectTo) {
            router.replace(result.redirectTo);
            router.refresh();
        } else if (result?.success) {
            setSuccess(true);
            setLoading(false);
        }
    }

    return (
        <AuthShell
            badge="Cadastro"
            title="Crie sua conta e entre em um workspace desenhado para explorar ideias visuais."
            description="Cadastro, confirmacao e entrada agora acompanham a mesma presenca visual da landing e dos modulos do produto."
            activeModuleId="graph"
        >
            <div className="rounded-[1.6rem] border p-5 sm:p-6" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                {success ? (
                    <>
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl border"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                                background: 'color-mix(in srgb, var(--app-accent-soft) 65%, transparent)',
                                color: 'var(--app-accent-text-strong)',
                            }}
                        >
                            <LuMailCheck className="h-7 w-7" />
                        </div>

                        <p className="theme-sidebar-copy-muted mt-5 text-[11px] font-semibold uppercase tracking-[0.3em]">
                            Quase la
                        </p>
                        <h1 className="theme-sidebar-title mt-3 text-3xl font-black tracking-[-0.03em]">
                            Verifique seu e-mail
                        </h1>
                        <p className="theme-sidebar-copy mt-4 text-sm leading-7">
                            Enviamos um link de confirmacao para ativar sua conta. Depois disso, voce ja pode entrar e abrir sua workspace.
                        </p>

                        <div className="mt-6 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                            <p className="theme-sidebar-copy text-sm leading-7">
                                Assim que confirmar o e-mail, volte para{' '}
                                <Link
                                    href={nextPath === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`}
                                    className="font-semibold underline"
                                    style={{ color: 'var(--app-accent-text)' }}
                                >
                                    o login
                                </Link>
                                .
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6">
                            <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                                Criar conta
                            </p>
                            <h1 className="theme-sidebar-title mt-3 text-3xl font-black tracking-[-0.03em]">
                                Comece com uma conta nova
                            </h1>
                            <p className="theme-sidebar-copy mt-3 text-sm leading-7">
                                Crie seu acesso para usar Paint, Graph e Automaton no mesmo ambiente, com uma interface mais forte e consistente.
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
                                        minLength={8}
                                        autoComplete="new-password"
                                        placeholder="No minimo 8 caracteres"
                                        className="min-w-0 grow bg-transparent text-sm outline-none"
                                    />
                                </div>
                            </label>

                            {error ? (
                                <div
                                    className="rounded-2xl border px-4 py-3 text-sm"
                                    style={{
                                        borderColor: 'color-mix(in srgb, #f87171 45%, transparent)',
                                        background: 'color-mix(in srgb, #f87171 12%, transparent)',
                                        color: '#fecaca',
                                    }}
                                >
                                    {error}
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
                                {loading ? 'Criando conta...' : 'Criar conta'}
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
                                Ja tem conta?{' '}
                                <Link
                                    href={nextPath === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`}
                                    className="font-semibold underline"
                                    style={{ color: 'var(--app-accent-text)' }}
                                >
                                    Entrar
                                </Link>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </AuthShell>
    );
}
