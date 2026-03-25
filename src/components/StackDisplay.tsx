'use client';

import GlassCard from './GlassCard';

export interface StackDisplayProps {
    stack: string[];  // índice 0 = topo
    initialPosition?: () => { x: number; y: number };
}

const StackDisplay = ({ stack, initialPosition }: StackDisplayProps) => {
    return (
        <GlassCard
            initial={initialPosition ?? (() => ({ x: Math.max(0, window.innerWidth - 620), y: 24 }))}
            className="workspace-menu-shell"
        >
            <div className="relative flex flex-col gap-[var(--pm-gap)] p-[var(--pm-pad)] min-w-28">
                {/* Header */}
                <div className="ui-menu-title-card rounded-xl px-[var(--pm-pad)] py-[var(--pm-btn-pad)] shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] ui-menu-title-heading">
                        Pilha
                    </span>
                </div>

                {/* Stack cells — topo para base */}
                <div className="flex flex-col gap-1">
                    {stack.length === 0 ? (
                        <span className="ui-panel-muted text-xs text-center py-1">Pilha vazia ✓</span>
                    ) : (
                        stack.map((symbol, index) => (
                            <div
                                key={index}
                                className={`stack-cell${index === 0 ? ' stack-cell-top' : ''}`}
                            >
                                {symbol}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </GlassCard>
    );
};

export default StackDisplay;
