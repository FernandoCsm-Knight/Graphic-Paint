export type GraphicsModule = {
    id: string;
    name: string;
    description: string;
    status: 'available' | 'planned';
};

export const graphicsModules: GraphicsModule[] = [
    {
        id: 'paint',
        name: 'Paint',
        description: 'Canvas drawing with smooth and pixelated modes, shape tools, filling, selection, and history.',
        status: 'available',
    },
    {
        id: 'graph',
        name: 'Graph',
        description: 'Interactive 2D graph builder with vertex/edge editing and algorithm execution on the user graph.',
        status: 'available',
    },
    {
        id: 'automaton',
        name: 'Automaton',
        description: 'AFN-λ editor with states, lambda transitions, initial/final state marking, and pan/zoom canvas.',
        status: 'available',
    },
];
