import WorkspaceProvider from '../../context/providers/WorkspaceProvider';
import PaintProvider from './context/providers/PaintProvider';
import ReplacementProvider from './context/providers/ReplacementProvider';
import SettingsProvider from './context/providers/SettingsProvider';
import PaintWorkspace from './PaintWorkspace';


const PaintModule = () => {
    return (
        <WorkspaceProvider>
            <PaintProvider>
                <ReplacementProvider>
                    <SettingsProvider>
                        <PaintWorkspace />
                    </SettingsProvider>
                </ReplacementProvider>
            </PaintProvider>
        </WorkspaceProvider>
    );
};

export default PaintModule;
