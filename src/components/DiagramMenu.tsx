'use client';

import { useState } from 'react';
import { LuHand, LuDownload, LuGrid2X2, LuTrash2, LuCircleDot, LuPlay } from 'react-icons/lu';
import GlassCard from './GlassCard';
import WorkspaceToolButton from './WorkspaceToolButton';
import MenuTitleCard, { type MenuSegment } from './MenuTitleCard';
import { useWorkspaceContext } from '../context/WorkspaceContext';

interface DiagramMenuProps {
    title: string;
    subtitle: string;
    badge: string;
    segments: [MenuSegment, MenuSegment];
    snapToGrid: boolean;
    onSnapToggle: () => void;
    onClear: () => void;
    onExport: () => void;
    showSimulation: boolean;
    onSimulationToggle: () => void;
    helpContent: React.ReactNode;
    hint?: React.ReactNode;
    extraContent?: React.ReactNode;
}

const DiagramMenu = ({
    title,
    subtitle,
    badge,
    segments,
    snapToGrid,
    onSnapToggle,
    onClear,
    onExport,
    showSimulation,
    onSimulationToggle,
    helpContent,
    hint,
    extraContent,
}: DiagramMenuProps) => {
    const { isPanModeActive, setPanModeActive } = useWorkspaceContext();
    const [showHelp, setShowHelp] = useState(false);

    return (
        <GlassCard initial={() => ({ x: 24, y: 24 })} className="workspace-menu-shell">
            <div className="relative min-w-52 md:min-w-72 flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)]">

                <MenuTitleCard
                    title={title}
                    subtitle={subtitle}
                    badge={badge}
                    segments={segments}
                />

                {hint}

                <div className="grid grid-cols-2 gap-[var(--pm-gap)]">
                    <WorkspaceToolButton
                        ariaLabel="Mover viewport"
                        title={isPanModeActive ? 'Desativar pan' : 'Ativar pan'}
                        stayActive
                        active={isPanModeActive}
                        onClick={() => setPanModeActive(!isPanModeActive)}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuHand className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Pan</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Snap to grid"
                        title={snapToGrid ? 'Desativar snap' : 'Ativar snap'}
                        stayActive
                        active={snapToGrid}
                        onClick={onSnapToggle}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuGrid2X2 className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Snap</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Limpar diagrama"
                        title="Limpar diagrama"
                        onClick={onClear}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuTrash2 className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Limpar</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Exportar SVG"
                        title="Exportar como SVG"
                        onClick={onExport}
                        className="flex items-center justify-center gap-2 px-3"
                    >
                        <LuDownload className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Exportar</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Abrir simulador"
                        title={showSimulation ? 'Fechar simulação' : 'Abrir simulação'}
                        stayActive
                        active={showSimulation}
                        onClick={onSimulationToggle}
                        className="flex items-center justify-center gap-2 px-3 col-span-2"
                    >
                        <LuPlay className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Simular</span>
                    </WorkspaceToolButton>

                    <WorkspaceToolButton
                        ariaLabel="Dica de uso"
                        title="Como usar"
                        onClick={() => setShowHelp(!showHelp)}
                        stayActive
                        active={showHelp}
                        className="flex items-center justify-center gap-2 px-3 col-span-2"
                    >
                        <LuCircleDot className="workspace-icon" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Ajuda</span>
                    </WorkspaceToolButton>
                </div>

                {extraContent}

                {showHelp && (
                    <div className="ui-menu-title-card rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)]">
                        <p className="ui-panel-muted text-xs leading-relaxed space-y-0.5">
                            {helpContent}
                        </p>
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

export default DiagramMenu;
