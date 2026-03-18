import type { ComponentType } from 'react';
import AutomatonModule from './automaton/AutomatonModule';
import GraphModule from './graph/GraphModule';
import PaintModule from './paint/PaintModule';

export type GraphicsModule = {
    id: string;
    name: string;
    description: string;
    status: 'available' | 'planned';
    surface: ComponentType;
};

export const graphicsModules: GraphicsModule[] = [
    {
        id: 'paint',
        name: 'Paint',
        description: 'Canvas drawing with smooth and pixelated modes, shape tools, filling, selection, and history.',
        status: 'available',
        surface: PaintModule,
    },
    {
        id: 'graph',
        name: 'Graph',
        description: 'Interactive 2D graph builder with vertex/edge editing and algorithm execution on the user graph.',
        status: 'available',
        surface: GraphModule,
    },
    {
        id: 'automaton',
        name: 'Automaton',
        description: 'AFN-λ editor with states, lambda transitions, initial/final state marking, and pan/zoom canvas.',
        status: 'available',
        surface: AutomatonModule,
    },
];
