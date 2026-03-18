import type { ComponentType, ReactNode } from 'react';
import AutomatonModule from './automaton/AutomatonModule';
import GraphModule from './graph/GraphModule';
import PaintModule from './paint/PaintModule';
import { FaPaintbrush, FaPuzzlePiece } from 'react-icons/fa6';
import { PiGraphBold } from 'react-icons/pi';

export type GraphicsModule = {
    id: string;
    name: string;
    description: string;
    status: 'available' | 'planned';
    surface: ComponentType;
};

export const moduleIcons: Record<string, ReactNode> = {
    paint: <FaPaintbrush className='ui-icon' />,
    graph: <PiGraphBold className='ui-icon' />,
    automaton: <FaPuzzlePiece className='ui-icon' />,
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
