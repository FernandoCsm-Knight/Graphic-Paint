'use client';

import { useState, startTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { graphicsModules } from '@/types/modules';
import Sidebar from './Sidebar';
import MobileTopbar from './MobileTopbar';

const ClientShell = ({
    children,
    isAuthenticated,
}: {
    children: React.ReactNode;
    isAuthenticated: boolean;
}) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const pathname = usePathname();
    const router = useRouter();

    const activeModuleId = pathname.split('/')[1] || 'paint';
    const activeModule = graphicsModules.find((m) => m.id === activeModuleId) ?? graphicsModules[0];

    return (
        <div className="h-screen overflow-hidden">
            <div className="flex h-full min-h-0">
                <Sidebar
                    modules={graphicsModules}
                    activeModule={activeModule}
                    isAuthenticated={isAuthenticated}
                    isCollapsed={isSidebarCollapsed}
                    isMobileOpen={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    onToggleCollapse={() => setIsSidebarCollapsed((c) => !c)}
                    onExpand={() => setIsSidebarCollapsed(false)}
                    onSelectModule={(moduleId) => {
                        startTransition(() => router.push(`/${moduleId}`));
                        setIsMobileSidebarOpen(false);
                    }}
                />

                <main className="relative z-0 h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                    <MobileTopbar
                        activeModuleName={activeModule.name}
                        onOpenSidebar={() => {
                            if(isSidebarCollapsed) setIsSidebarCollapsed(false);
                            setIsMobileSidebarOpen(true);
                        }}
                    />

                    <div className="theme-workspace-gradient absolute inset-0" />
                    <div className="relative h-full min-h-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ClientShell;
