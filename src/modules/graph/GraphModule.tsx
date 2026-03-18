import WorkspaceProvider from '../../context/providers/WorkspaceProvider';
import GraphProvider from './context/providers/GraphProvider';
import GraphWorkspace from './GraphWorkspace';

const GraphModule = () => {
    return (
        <WorkspaceProvider>
            <GraphProvider>
                <GraphWorkspace />
            </GraphProvider>
        </WorkspaceProvider>
    );
};

export default GraphModule;
