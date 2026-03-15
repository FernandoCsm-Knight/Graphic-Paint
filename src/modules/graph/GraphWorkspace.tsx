import { useRef } from 'react';
import { useGraphContext } from './context/GraphContext';
import { useGraphD3 } from './hooks/useGraphD3';
import { useAlgorithmPlayer } from './hooks/useAlgorithmPlayer';
import GraphMenu from './components/GraphMenu';
import GraphPlayerCard from './components/GraphPlayerCard';
import LabelEditor from './components/LabelEditor';

const GraphWorkspace = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { state, dispatch } = useGraphContext();

    useGraphD3(svgRef, state, dispatch);
    useAlgorithmPlayer(state, dispatch);

    return (
        <>
            {/* Floating menus — absolutely positioned within the relative workspace container */}
            <GraphMenu />
            <GraphPlayerCard />

            {/* SVG canvas */}
            <main className="relative h-full min-h-0 w-full overflow-hidden">
                <svg
                    ref={svgRef}
                    className="graph-svg absolute inset-0 w-full h-full block"
                />
                {/* Label editor uses fixed positioning computed from svgRef's bounding rect */}
                <LabelEditor svgRef={svgRef} />
            </main>
        </>
    );
};

export default GraphWorkspace;
