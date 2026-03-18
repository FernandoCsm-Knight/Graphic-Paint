import { LuChevronLeft, LuChevronRight, LuPanelsTopLeft } from 'react-icons/lu';
import RippleButton from './RippleButton';
import ThemePicker from './ThemePicker';
import { moduleIcons, type GraphicsModule } from '../modules/modules';

type SidebarProps = {
    modules: GraphicsModule[];
    activeModule: GraphicsModule;
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
                className={`app-sidebar-shell theme-sidebar-shell fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 w-[min(86vw,340px)] flex-col overflow-hidden border-r backdrop-blur-xl transition-transform duration-300 lg:relative lg:z-[120] lg:h-full lg:translate-x-0 ${
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
                            <a
                                href="/"
                                className="theme-sidebar-kicker text-xs font-semibold uppercase tracking-[0.35em] hover:underline"
                            >
                                Graphic-Paint
                            </a>

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
                        <a
                            href="/"
                            className="theme-sidebar-brand-mark flex h-15 w-15 items-center justify-center rounded-2xl text-center text-lg font-bold uppercase"
                        >
                            G
                        </a>

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
                                        <>
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="theme-sidebar-title text-lg font-medium">
                                                    {module.name}
                                                </span>

                                                <span
                                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
                                                        module.status === 'available'
                                                            ? 'theme-status-available'
                                                            : 'theme-status-soon'
                                                    }`}
                                                >
                                                    {module.status}
                                                </span>
                                            </div>

                                            <p className="theme-sidebar-copy text-sm leading-6">
                                                {module.description}
                                            </p>
                                        </>
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
