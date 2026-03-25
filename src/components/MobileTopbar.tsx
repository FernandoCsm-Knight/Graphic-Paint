'use client';

import { LuMenu } from 'react-icons/lu';
import RippleButton from './RippleButton';

type MobileTopbarProps = {
    activeModuleName: string;
    onOpenSidebar: () => void;
};

const MobileTopbar = ({ activeModuleName, onOpenSidebar }: MobileTopbarProps) => {
    return (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4 lg:hidden">
            <RippleButton
                controlId="mobile-open"
                className="sidebar-toggle"
                ariaLabel="Abrir menu lateral"
                onClick={onOpenSidebar}
            >
                <LuMenu className="h-5 w-5" />
            </RippleButton>

            <div className="theme-mobile-pill rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] backdrop-blur-xl">
                {activeModuleName}
            </div>
        </div>
    );
};

export default MobileTopbar;