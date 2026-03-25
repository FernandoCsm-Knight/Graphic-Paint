import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowUpRight, LuLayers3, LuShieldCheck, LuSparkles } from 'react-icons/lu';
import ModuleCardBody from '@/components/ModuleCard';
import { graphicsModules } from '@/types/modules';

const authModuleMeta: Record<string, { summary: string; points: string[] }> = {
    paint: {
        summary: 'Ferramentas de desenho, pixel art e selecao em um canvas feito para explorar ideias rapido.',
        points: ['Canvas fluido', 'Selecao visual'],
    },
    graph: {
        summary: 'Grafos editaveis com execucao de algoritmos e leitura visual imediata do estado do problema.',
        points: ['Algoritmos', 'Edicao direta'],
    },
    automaton: {
        summary: 'Estados, transicoes e simulacoes no mesmo fluxo para modelar comportamentos com clareza.',
        points: ['Simulacao', 'AFN e pilha'],
    },
};

type AuthShellProps = {
    badge: string;
    title: string;
    description: string;
    activeModuleId: string;
    children: ReactNode;
};

const AuthShell = ({
    badge,
    title,
    description,
    activeModuleId,
    children,
}: AuthShellProps) => {
    return (
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <aside className="hidden lg:block">
                <div className="module-card rounded-[2rem] p-6">
                    <span
                        className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--app-accent-border) 70%, transparent)',
                            background: 'color-mix(in srgb, var(--app-accent-soft) 50%, transparent)',
                            color: 'var(--app-accent-text-strong)',
                        }}
                    >
                        {badge}
                    </span>

                    <h1 className="theme-sidebar-title mt-6 text-4xl font-black leading-tight tracking-[-0.04em]">
                        {title}
                    </h1>

                    <p className="theme-sidebar-copy mt-4 max-w-xl text-base leading-8">
                        {description}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                            <LuLayers3 className="theme-module-accent-text h-5 w-5" />
                            <p className="theme-sidebar-title mt-3 text-sm font-semibold">Sistema unico</p>
                            <p className="theme-sidebar-copy mt-2 text-xs leading-6">
                                Mesma linguagem visual da home ate a workspace.
                            </p>
                        </div>
                        <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                            <LuShieldCheck className="theme-module-accent-text h-5 w-5" />
                            <p className="theme-sidebar-title mt-3 text-sm font-semibold">Entrada simples</p>
                            <p className="theme-sidebar-copy mt-2 text-xs leading-6">
                                Entre ou crie conta e continue o fluxo sem friccao.
                            </p>
                        </div>
                        <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--app-sidebar-border)' }}>
                            <LuSparkles className="theme-module-accent-text h-5 w-5" />
                            <p className="theme-sidebar-title mt-3 text-sm font-semibold">Produto com presenca</p>
                            <p className="theme-sidebar-copy mt-2 text-xs leading-6">
                                Cards, destaque e hierarquia visual mais fortes.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        {graphicsModules.map((module) => (
                            <div
                                key={module.id}
                                className={`module-card rounded-3xl p-4 ${
                                    module.id === activeModuleId
                                        ? 'theme-module-card-active ring-1'
                                        : 'theme-module-card-idle'
                                }`}
                            >
                                <ModuleCardBody
                                    module={module}
                                    description={authModuleMeta[module.id]?.summary ?? module.description}
                                    footer={
                                        <div className="flex flex-wrap gap-2">
                                            {(authModuleMeta[module.id]?.points ?? []).map((item) => (
                                                <span
                                                    key={item}
                                                    className="rounded-full px-3 py-1 text-[11px] font-semibold"
                                                    style={{
                                                        background: 'color-mix(in srgb, var(--app-accent-soft) 72%, transparent)',
                                                        color: 'var(--app-accent-text-strong)',
                                                    }}
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <Link
                        href="/"
                        className="theme-sidebar-copy mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline"
                    >
                        Voltar para a landing
                        <LuArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>
            </aside>

            <section className="module-card rounded-[2rem] p-5 sm:p-6 lg:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <Link href="/" className="theme-sidebar-kicker text-[11px] font-semibold uppercase tracking-[0.34em] hover:underline">
                            Graphic Paint
                        </Link>
                        <p className="theme-sidebar-title mt-3 text-2xl font-semibold">
                            Acesso a workspace
                        </p>
                        <p className="theme-sidebar-copy mt-2 max-w-md text-sm leading-7">
                            Entre na sua conta ou crie uma nova sem sair da mesma identidade visual do produto.
                        </p>
                    </div>

                    <span className="theme-mobile-pill rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                        {badge}
                    </span>
                </div>

                {children}
            </section>
        </div>
    );
};

export default AuthShell;
