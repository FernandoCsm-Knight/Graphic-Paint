import Link from 'next/link';
import { LuArrowRight, LuBlocks, LuSparkles, LuWorkflow } from 'react-icons/lu';
import ModuleCardBody from '@/components/ModuleCard';
import { createClient } from '@/lib/supabase/server';
import { graphicsModules } from '@/types/modules';

const landingModuleMeta: Record<string, { summary: string; highlights: string[] }> = {
    paint: {
        summary: 'Desenho vetorial e pixel art no mesmo canvas, com seleção, preenchimento, histórico e ferramentas de forma.',
        highlights: ['Canvas fluido', 'Pixel art', 'Ferramentas visuais'],
    },
    graph: {
        summary: 'Monte grafos, edite vértices e arestas e rode algoritmos visualmente no mesmo workspace interativo.',
        highlights: ['Algoritmos visuais', 'Edição instantânea', 'Exploração orientada'],
    },
    automaton: {
        summary: 'Modele AFN-lambda e autômatos com pilha, acompanhe simulações e ajuste estados e transições com rapidez.',
        highlights: ['AFN-lambda', 'Autômato de pilha', 'Simulação passo a passo'],
    },
};

const landingHighlights = [
    {
        title: 'Tudo em um único workspace',
        copy: 'Desenho, grafos e autômatos compartilham a mesma linguagem visual e a mesma navegação.',
        icon: <LuBlocks className="h-5 w-5" />,
    },
    {
        title: 'Fluxo feito para iterar',
        copy: 'Ajuste, teste, compare e refine sem trocar de ferramenta ou perder o contexto.',
        icon: <LuWorkflow className="h-5 w-5" />,
    },
    {
        title: 'Interface com presença',
        copy: 'Cards, menus e interações foram desenhados para parecer produto, não protótipo.',
        icon: <LuSparkles className="h-5 w-5" />,
    },
];

export default async function HomePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div
            className="relative min-h-full overflow-hidden"
            style={{
                background: `
                    radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--app-accent-soft-strong) 45%, transparent) 0%, transparent 30%),
                    radial-gradient(circle at 82% 14%, color-mix(in srgb, var(--app-status-available-bg) 28%, transparent) 0%, transparent 24%),
                    radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--app-accent-soft) 35%, transparent) 0%, transparent 38%),
                    linear-gradient(180deg, color-mix(in srgb, var(--app-sidebar-surface) 94%, transparent), transparent 26%),
                    var(--app-body-accent-primary)
                `,
                color: 'var(--app-shell-text)',
            }}
        >
            <header
                className="sticky top-0 z-20 border-b backdrop-blur-xl"
                style={{
                    borderColor: 'var(--app-sidebar-border)',
                    background: 'color-mix(in srgb, var(--app-sidebar-surface) 84%, transparent)',
                }}
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="theme-sidebar-brand-mark flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold uppercase">
                            GP
                        </span>
                        <div>
                            <p className="theme-sidebar-kicker text-[10px] font-semibold uppercase tracking-[0.36em]">
                                Graphic Paint
                            </p>
                            <p className="theme-sidebar-title text-sm font-medium">
                                Workspace visual integrado
                            </p>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-2 md:flex">
                        <span className="theme-mobile-pill rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                            Paint
                        </span>
                        <span className="theme-mobile-pill rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                            Graph
                        </span>
                        <span className="theme-mobile-pill rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                            Automaton
                        </span>
                    </div>

                    {
                        user ? (
                            <Link
                                href="/dashboard"
                                className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                                style={{
                                    background: 'var(--app-accent-text)',
                                    color: 'var(--ui-menu-card-surface)',
                                }}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex gap-3">
                                <Link
                                    href="/login"
                                    className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                                    style={{
                                        border: '1px solid var(--app-accent-border)',
                                        color: 'var(--app-accent-text)',
                                    }}
                                >
                                    Entrar
                                </Link>
                                <Link
                                    href="/register"
                                    className="rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                                    style={{
                                        background: 'var(--app-accent-text)',
                                        color: 'var(--ui-menu-card-surface)',
                                    }}
                                >
                                    Criar conta
                                </Link>
                            </div>
                        )
                    }
                </div>
            </header>

            <main className="relative">
                <section className="px-6 pb-14 pt-12 md:pt-18 lg:pb-20 lg:pt-20">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
                        <div>
                            <span
                                className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--app-accent-border) 70%, transparent)',
                                    background: 'color-mix(in srgb, var(--app-accent-soft) 50%, transparent)',
                                    color: 'var(--app-accent-text-strong)',
                                }}
                            >
                                Paint, Graph e Automaton em um único lugar
                            </span>

                            <h1
                                className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.04em] md:text-6xl lg:text-7xl"
                                style={{ color: 'var(--app-sidebar-title)' }}
                            >
                                Transforme ideias visuais em um workspace que realmente parece produto.
                            </h1>

                            <p className="theme-sidebar-copy mt-6 max-w-2xl text-base leading-8 md:text-lg">
                                O Graphic Paint junta desenho, grafos e autômatos em uma interface única, com cards, menus
                                e interações pensados para explorar, iterar e apresentar melhor.
                            </p>

                            {
                                !user && (
                                    <div className="mt-8 flex flex-wrap gap-4">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition-opacity hover:opacity-90"
                                            style={{
                                                background: 'var(--app-accent-text)',
                                                color: 'var(--ui-menu-card-surface)',
                                            }}
                                        >
                                        Começar grátis
                                        <LuArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                            href="/paint"
                                            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition-opacity hover:opacity-80"
                                            style={{
                                                border: '1px solid var(--app-accent-border)',
                                                color: 'var(--app-accent-text)',
                                            }}
                                        >
                                            Explorar como convidado
                                        </Link>
                                    </div>
                                )
                            }

                            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                <div className="module-card rounded-3xl p-4">
                                    <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.26em]">
                                        Módulos
                                    </p>
                                    <p className="theme-sidebar-title mt-2 text-3xl font-black">3</p>
                                    <p className="theme-sidebar-copy mt-2 text-sm leading-6">
                                        ferramentas visuais conectadas pelo mesmo sistema de interface.
                                    </p>
                                </div>
                                <div className="module-card rounded-3xl p-4">
                                    <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.26em]">
                                        Navegação
                                    </p>
                                    <p className="theme-sidebar-title mt-2 text-3xl font-black">1</p>
                                    <p className="theme-sidebar-copy mt-2 text-sm leading-6">
                                        linguagem visual para criar, explorar e apresentar sem trocar de contexto.
                                    </p>
                                </div>
                                <div className="module-card rounded-3xl p-4">
                                    <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.26em]">
                                        Experiência
                                    </p>
                                    <p className="theme-sidebar-title mt-2 text-3xl font-black">100%</p>
                                    <p className="theme-sidebar-copy mt-2 text-sm leading-6">
                                        no navegador, pronta para abrir e começar a testar ideias rapidamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="module-card rounded-[2rem] p-5 md:p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.28em]">
                                        Workspace preview
                                    </p>
                                    <h2 className="theme-sidebar-title mt-2 text-2xl font-semibold">
                                        Interface forte, módulos claros e foco na exploração
                                    </h2>
                                </div>
                                <span className="theme-status-available rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]">
                                    online
                                </span>
                            </div>

                            <div
                                className="mt-6 rounded-[1.6rem] border p-4"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--app-sidebar-border) 70%, transparent)',
                                    background: 'color-mix(in srgb, var(--app-sidebar-surface) 70%, transparent)',
                                }}
                            >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    </div>
                                    <span className="theme-sidebar-copy-muted text-xs">
                                        Barra lateral com módulos reais do projeto
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {graphicsModules.map((module) => (
                                        <div
                                            key={`preview-${module.id}`}
                                            className={`module-card rounded-3xl p-4 ${
                                                module.id === 'paint' ? 'theme-module-card-active ring-1' : 'theme-module-card-idle'
                                            }`}
                                        >
                                            <ModuleCardBody
                                                module={module}
                                                description={landingModuleMeta[module.id]?.summary ?? module.description}
                                                footer={
                                                    <div className="flex flex-wrap gap-2">
                                                        {(landingModuleMeta[module.id]?.highlights ?? []).map((item) => (
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
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-14 lg:pb-18">
                    <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
                        {landingHighlights.map((item) => (
                            <div key={item.title} className="module-card rounded-3xl p-5">
                                <span
                                    className="theme-module-accent-text flex h-12 w-12 items-center justify-center rounded-2xl border"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                                        background: 'color-mix(in srgb, var(--app-accent-soft) 60%, transparent)',
                                    }}
                                >
                                    {item.icon}
                                </span>
                                <h2 className="theme-sidebar-title mt-4 text-xl font-semibold">
                                    {item.title}
                                </h2>
                                <p className="theme-sidebar-copy mt-3 text-sm leading-7">
                                    {item.copy}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="px-6 pb-24">
                    <div
                        className="mx-auto max-w-7xl rounded-[2.25rem] border px-6 py-8 md:px-8 md:py-10"
                        style={{
                            borderColor: 'var(--app-sidebar-border)',
                            background: 'color-mix(in srgb, var(--app-sidebar-surface) 82%, transparent)',
                        }}
                    >
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="theme-sidebar-copy-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
                                    Módulos do produto
                                </p>
                                <h2 className="theme-sidebar-title mt-3 text-3xl font-black tracking-[-0.03em]">
                                    Os mesmos cards da sidebar, agora apresentando a plataforma
                                </h2>
                            </div>
                            <p className="theme-sidebar-copy max-w-2xl text-sm leading-7 md:text-base">
                                Cada módulo foi desenhado para parecer parte do mesmo sistema. A home agora apresenta isso
                                com a mesma linguagem visual usada dentro do app.
                            </p>
                        </div>

                        <div className="mt-8 grid gap-5 lg:grid-cols-3">
                            {graphicsModules.map((module) => (
                                <Link
                                    key={module.id}
                                    href={`/${module.id}`}
                                    className={`module-card module-card-button flex h-full flex-col rounded-[2rem] p-5 text-left transition duration-200 ${
                                        module.id === 'paint'
                                            ? 'theme-module-card-active ring-1'
                                            : 'theme-module-card-idle'
                                    }`}
                                >
                                    <ModuleCardBody
                                        module={module}
                                        description={landingModuleMeta[module.id]?.summary ?? module.description}
                                        footer={
                                            <div className="mt-auto">
                                                <div className="flex flex-wrap gap-2">
                                                    {(landingModuleMeta[module.id]?.highlights ?? []).map((item) => (
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

                                                {
                                                    !user && (
                                                        <div
                                                            className="mt-5 flex items-center justify-between rounded-2xl border px-4 py-3"
                                                            style={{
                                                                borderColor: 'color-mix(in srgb, var(--app-accent-border) 55%, transparent)',
                                                                background: 'color-mix(in srgb, var(--app-module-surface) 72%, transparent)',
                                                            }}
                                                        >
                                                            <span className="theme-sidebar-copy text-sm font-medium">
                                                                {user ? `Abrir módulo ${module.name}` : `Explorar ${module.name} como convidado`}
                                                            </span>
                                                            <LuArrowRight className="h-4 w-4" />
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        }
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer
                className="border-t py-5 text-center text-xs"
                style={{
                    borderColor: 'var(--app-sidebar-border)',
                    color: 'var(--app-sidebar-text-muted)',
                    background: 'color-mix(in srgb, var(--app-sidebar-surface) 88%, transparent)',
                }}
            >
                Graphic Paint &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}
