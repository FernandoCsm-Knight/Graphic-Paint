import GraphProvider from './context/providers/GraphProvider';
import GraphWorkspace from './GraphWorkspace';

const GraphModule = () => {
    return (
        <GraphProvider>
            <GraphWorkspace />
        </GraphProvider>
    );
};

export default GraphModule;
