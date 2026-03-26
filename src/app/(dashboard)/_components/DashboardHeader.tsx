'use client';

import Link from 'next/link';
import { LuArrowUpRight, LuLogOut } from 'react-icons/lu';
import { signout } from '@/lib/supabase/actions';

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
    return (
        <header
            className="shrink-0 border-b px-6 py-4 backdrop-blur-xl"
            style={{
                background:  'color-mix(in srgb, var(--app-sidebar-surface) 82%, transparent)',
                borderColor: 'var(--app-sidebar-border)',
            }}
        >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-3">
                    <span className="theme-sidebar-brand-mark flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold uppercase">
                        GP
                    </span>

                    <div>
                        <p className="theme-sidebar-kicker text-[11px] font-semibold uppercase tracking-[0.34em]">
                            Graphic Paint
                        </p>
                        <p className="theme-sidebar-title mt-1 text-base font-semibold">
                            Central do workspace
                        </p>
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="theme-mobile-pill hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] md:inline-flex"
                    >
                        <LuArrowUpRight className="h-4 w-4" />
                        Landing
                    </Link>

                    <div
                        className="hidden rounded-full border px-4 py-2 md:block"
                        style={{
                            borderColor: 'var(--app-sidebar-border)',
                            background: 'color-mix(in srgb, var(--app-sidebar-surface) 62%, transparent)',
                        }}
                    >
                        <p className="theme-sidebar-copy-muted text-[10px] font-semibold uppercase tracking-[0.28em]">
                            Conta ativa
                        </p>
                        <p className="theme-sidebar-title mt-1 text-sm font-medium">
                            {userEmail}
                        </p>
                    </div>

                    <button
                        onClick={() => signout()}
                        className="flex w-full items-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.2em]"
                    >
                        <LuLogOut className="h-4 w-4" />
                        Sair
                    </button>
                </div>
            </div>
        </header>
    );
}
