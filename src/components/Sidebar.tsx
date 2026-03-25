'use client';

import Link from 'next/link';
import { LuChevronLeft, LuChevronRight, LuLayoutDashboard, LuPanelsTopLeft } from 'react-icons/lu';
import RippleButton from './RippleButton';
import ThemePicker from './ThemePicker';
import { GraphicsModule } from '@/types/modules';
import ModuleCardBody, { moduleIcons } from './ModuleCard';

type SidebarProps = {
    modules: GraphicsModule[];
    activeModule: GraphicsModule;
    isAuthenticated: boolean;
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
    onToggleCollapse: () => void;
    onExpand: () => void;
    onSelectModule: (moduleId: string) => void;
};

const Sidebar = ({
    modules,
    activeModule,
    isAuthenticated,
    isCollapsed,
    isMobileOpen,
    onCloseMobile,
    onToggleCollapse,
    onExpand,
    onSelectModule
}: SidebarProps) => {
    return (
        <>
            <div
                className={`theme-sidebar-overlay fixed inset-0 z-30 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    isMobileOpen
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
                onClick={onCloseMobile}
            />

            <aside
                className={`app-sidebar-shell theme-sidebar-shell fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 w-[min(86vw,340px)] flex-col overflow-hidden border-r backdrop-blur-xl transition-transform duration-300 lg:relative lg:z-120 lg:h-full lg:translate-x-0 ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                } ${isCollapsed ? 'lg:w-24' : 'lg:w-80'}`}
            >
                <div
                    className={`border-b border-slate-800/80 ${
                        isCollapsed ? 'px-4 py-4 lg:px-3 lg:py-3' : 'px-4 py-4 lg:px-5'
                    }`}
                >
                    <div
                        className={`items-start justify-between gap-3 ${
                            isCollapsed ? 'lg:hidden' : 'flex'
                        }`}
                    >
                        <div>
                            <Link
                                href="/"
                                className="theme-sidebar-kicker text-xs font-semibold uppercase tracking-[0.35em] hover:underline"
                            >
                                Graphic-Paint
                            </Link>

                            <h1 className="theme-sidebar-title mt-2 text-2xl font-semibold">
                                Graphics workspace
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <RippleButton
                                controlId="sidebar-collapse"
                                className="sidebar-toggle"
                                ariaLabel={
                                    isMobileOpen
                                        ? 'Fechar barra lateral'
                                        : isCollapsed
                                          ? 'Expandir barra lateral'
                                          : 'Colapsar barra lateral'
                                }
                                onClick={() => {
                                    if (window.innerWidth < 1024) {
                                        onCloseMobile();
                                        return;
                                    }

                                    onToggleCollapse();
                                }}
                            >
                                {isMobileOpen || !isCollapsed ? (
                                    <LuChevronLeft className="h-5 w-5" />
                                ) : (
                                    <LuChevronRight className="h-5 w-5" />
                                )}
                            </RippleButton>
                        </div>
                    </div>

                    <div
                        className={`${
                            isCollapsed
                                ? 'hidden lg:flex lg:flex-col lg:items-center lg:gap-3'
                                : 'hidden'
                        }`}
                    >
                        <Link
                            href="/"
                            className="theme-sidebar-brand-mark flex h-15 w-15 items-center justify-center rounded-2xl text-center text-lg font-bold uppercase"
                        >
                            G
                        </Link>

                        <RippleButton
                            controlId="sidebar-expand"
                            className="sidebar-toggle"
                            ariaLabel="Expandir barra lateral"
                            onClick={onExpand}
                        >
                            <LuChevronRight className="h-5 w-5" />
                        </RippleButton>
                    </div>
                </div>

                <div className="scrollbar min-h-0 grow overflow-y-auto overflow-x-hidden px-4 py-5 lg:px-5">
                    <div className="space-y-3">
                        {isAuthenticated ? (
                            <Link
                                href="/dashboard"
                                className={`module-card module-card-button flex w-full items-center gap-3 rounded-3xl transition duration-200 ${
                                    isCollapsed ? 'lg:justify-center lg:px-0 lg:py-4' : 'px-4 py-3.5'
                                } theme-module-card-idle`}
                                title={isCollapsed ? 'Voltar ao dashboard' : undefined}
                            >
                                <span className="flex  shrink-0 items-center justify-center rounded-2xl">
                                    <LuLayoutDashboard className="h-5 w-5" />
                                </span>
                                {!isCollapsed && (
                                    <div className="min-w-0">
                                        <p className="theme-sidebar-title text-sm font-semibold">
                                            Dashboard
                                        </p>
                                        <p className="theme-sidebar-copy-muted text-xs leading-5">
                                            Voltar para as pastas e projetos
                                        </p>
                                    </div>
                                )}
                            </Link>
                        ) : (
                            !isCollapsed && (
                                <div
                                    className="module-card rounded-3xl px-4 py-3.5"
                                    style={{
                                        border: '1px solid color-mix(in srgb, var(--app-accent-border) 58%, transparent)',
                                        background: 'color-mix(in srgb, var(--app-accent-soft) 32%, transparent)',
                                    }}
                                >
                                    <p className="theme-sidebar-title text-sm font-semibold">
                                        Modo convidado
                                    </p>
                                    <p className="theme-sidebar-copy mt-1 text-xs leading-5">
                                        Sem dashboard e sem salvamento online. Entre para sincronizar projetos.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <Link
                                            href="/login"
                                            className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                            style={{
                                                border: '1px solid var(--app-accent-border)',
                                                color: 'var(--app-accent-text)',
                                            }}
                                        >
                                            Entrar
                                        </Link>
                                        <Link
                                            href="/register"
                                            className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                            style={{
                                                background: 'var(--app-accent-text)',
                                                color: 'var(--ui-menu-card-surface)',
                                            }}
                                        >
                                            Criar conta
                                        </Link>
                                    </div>
                                </div>
                            )
                        )}

                        <div
                            className={`sidebar-panel-copy theme-sidebar-copy-muted flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] ${
                                isCollapsed
                                    ? 'lg:pointer-events-none lg:max-h-0 lg:-translate-y-2 lg:opacity-0'
                                    : 'lg:max-h-10 lg:translate-y-0 lg:opacity-100'
                            }`}
                        >
                            <LuPanelsTopLeft className="h-4 w-4" />
                            Modules
                        </div>

                        {modules.map((module) => {
                            const isActive = module.id === activeModule.id;

                            return (
                                <RippleButton
                                    key={module.id}
                                    controlId={`module-${module.id}`}
                                    className={`module-card module-card-button w-full  rounded-3xl text-left transition duration-200 ${
                                        isCollapsed
                                            ? 'lg:flex lg:items-center lg:justify-center aspect-square'
                                            : 'px-4 py-4'
                                    } ${
                                        isActive
                                            ? 'theme-module-card-active ring-1'
                                            : 'theme-module-card-idle'
                                    }`}
                                    ariaLabel={
                                        isCollapsed
                                            ? `Abrir modulo ${module.name}`
                                            : undefined
                                    }
                                    title={isCollapsed ? module.name : undefined}
                                    onClick={() => onSelectModule(module.id)}
                                >
                                    {isCollapsed ? (moduleIcons[module.id] || '?') : (
                                        <ModuleCardBody module={module} />
                                    )}
                                </RippleButton>
                            );
                        })}
                    </div>
                </div>

                <ThemePicker isCollapsed={isCollapsed} />
            </aside>
        </>
    );
};

export default Sidebar;
