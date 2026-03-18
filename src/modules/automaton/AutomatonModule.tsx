import WorkspaceProvider from '../../context/providers/WorkspaceProvider';
import AutomatonProvider from './context/providers/AutomatonProvider';
import AutomatonWorkspace from './AutomatonWorkspace';

const AutomatonModule = () => {
    return (
        <WorkspaceProvider>
            <AutomatonProvider>
                <AutomatonWorkspace />
            </AutomatonProvider>
        </WorkspaceProvider>
    );
};

export default AutomatonModule;
