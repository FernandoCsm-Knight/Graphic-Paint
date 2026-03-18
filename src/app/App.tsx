import { useState, startTransition } from 'react';
import { graphicsModules } from '../modules/modules';
import Sidebar from '../components/Sidebar';
import MobileTopbar from '../components/MobileTopbar';

const App = () => {
    const [activeModuleId, setActiveModuleId] = useState('paint');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const activeModule = graphicsModules.find((module) => module.id === activeModuleId) ?? graphicsModules[0];

    const ActiveSurface = activeModule.surface;

    return (
        <div className="h-screen overflow-hidden">
            <div className="flex h-full min-h-0">
                <Sidebar
                    modules={graphicsModules}
                    activeModule={activeModule}
                    isCollapsed={isSidebarCollapsed}
                    isMobileOpen={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
                    onExpand={() => setIsSidebarCollapsed(false)}
                    onSelectModule={(moduleId) => {
                        startTransition(() => setActiveModuleId(moduleId));
                        setIsMobileSidebarOpen(false);
                    }}
                />

                <main className="relative z-0 h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                    <MobileTopbar
                        activeModuleName={activeModule.name}
                        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                    />

                    <div className="theme-workspace-gradient absolute inset-0" />
                    <div className="relative h-full min-h-0">
                        <ActiveSurface />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
