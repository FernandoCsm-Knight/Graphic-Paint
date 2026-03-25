import type { GraphicsModule } from '@/types/modules';
import type { ReactNode } from 'react';
import { FaPaintbrush, FaPuzzlePiece } from 'react-icons/fa6';
import { PiGraphBold } from 'react-icons/pi';

export const moduleIcons: Record<string, ReactNode> = {
    paint: <FaPaintbrush className="ui-icon" />,
    graph: <PiGraphBold className="ui-icon" />,
    automaton: <FaPuzzlePiece className="ui-icon" />,
};

type ModuleCardBodyProps = {
    module: GraphicsModule;
    description?: string;
    footer?: ReactNode;
    showIcon?: boolean;
    showStatus?: boolean;
};

const ModuleCardBody = ({
    module,
    description,
    footer,
    showIcon = true,
    showStatus = true,
}: ModuleCardBodyProps) => {
    return (
        <>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    {showIcon ? (
                        <span
                            className="theme-module-accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--app-accent-border) 75%, transparent)',
                                background: 'color-mix(in srgb, var(--app-accent-soft) 72%, transparent)',
                            }}
                        >
                            {moduleIcons[module.id] ?? '?'}
                        </span>
                    ) : null}

                    <div className="min-w-0">
                        <p className="theme-sidebar-copy-muted text-[10px] font-semibold uppercase tracking-[0.3em]">
                            {module.id}
                        </p>
                        <h3 className="theme-sidebar-title mt-1 text-lg font-medium">
                            {module.name}
                        </h3>
                    </div>
                </div>

                {showStatus ? (
                    <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
                            module.status === 'available'
                                ? 'theme-status-available'
                                : 'theme-status-soon'
                        }`}
                    >
                        {module.status}
                    </span>
                ) : null}
            </div>

            <p className="theme-sidebar-copy text-sm leading-6">
                {description ?? module.description}
            </p>

            {footer ? <div className="mt-4">{footer}</div> : null}
        </>
    );
};

export default ModuleCardBody;
