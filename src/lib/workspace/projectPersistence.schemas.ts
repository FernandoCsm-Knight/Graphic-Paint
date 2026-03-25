import { z } from 'zod';

export const workspaceModuleSchema = z.enum(['paint', 'graph', 'automaton']);

export const moduleProjectParamsSchema = z.object({
    module: workspaceModuleSchema,
    projectId: z.uuid('Projeto invalido.'),
});

const pointSchema = z.object({
    x: z.number().finite(),
    y: z.number().finite(),
});

export const graphNodeSnapshotSchema = z.object({
    id: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    label: z.string().max(255),
});

export const graphEdgeSnapshotSchema = z.object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    weight: z.number().finite(),
});

export const graphProjectSnapshotSchema = z.object({
    directed: z.boolean(),
    snapToGrid: z.boolean(),
    gridSize: z.number().int().positive(),
    canvasWidth: z.number().finite().positive(),
    canvasHeight: z.number().finite().positive(),
    viewOffset: pointSchema,
    zoom: z.number().finite().positive(),
    nodes: z.array(graphNodeSnapshotSchema),
    edges: z.array(graphEdgeSnapshotSchema),
});

export const automatonStateSnapshotSchema = z.object({
    id: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    label: z.string().max(255),
    isInitial: z.boolean(),
    isFinal: z.boolean(),
});

export const automatonTransitionSnapshotSchema = z.object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    symbol: z.string().max(255),
    stackPop: z.string().max(255).optional(),
    stackPush: z.string().max(255).optional(),
});

export const automatonProjectSnapshotSchema = z.object({
    automatonType: z.enum(['AFN_LAMBDA', 'PUSHDOWN']),
    snapToGrid: z.boolean(),
    gridSize: z.number().int().positive(),
    canvasWidth: z.number().finite().positive(),
    canvasHeight: z.number().finite().positive(),
    viewOffset: pointSchema,
    zoom: z.number().finite().positive(),
    states: z.array(automatonStateSnapshotSchema),
    transitions: z.array(automatonTransitionSnapshotSchema),
});

export const paintSceneItemSnapshotSchema = z.object({
    position: z.number().int().min(0),
    kind: z.string().min(1).max(64),
    data: z.unknown(),
});

export const paintProjectSnapshotSchema = z.object({
    canvasWidth: z.number().int().positive(),
    canvasHeight: z.number().int().positive(),
    pixelated: z.boolean(),
    pixelSize: z.number().int().positive(),
    viewOffset: pointSchema,
    zoom: z.number().finite().positive(),
    lineAlgorithm: z.enum(['bresenham', 'dda']),
    gridDisplay: z.enum(['behind', 'front', 'none']),
    clipAlgorithm: z.enum(['cohen-sutherland', 'liang-barsky', 'sutherland-hodgman']),
    lineDash: z.enum(['solid', 'dashed', 'dotted']),
    brushStyle: z.enum(['smooth', 'hard', 'spray']),
    placementMode: z.enum(['bbox', 'vertices']),
    scene: z.array(paintSceneItemSnapshotSchema),
});

export type WorkspaceModule = z.infer<typeof workspaceModuleSchema>;
export type GraphProjectSnapshot = z.infer<typeof graphProjectSnapshotSchema>;
export type AutomatonProjectSnapshot = z.infer<typeof automatonProjectSnapshotSchema>;
export type PaintSceneItemSnapshot = z.infer<typeof paintSceneItemSnapshotSchema>;
export type PaintProjectSnapshot = z.infer<typeof paintProjectSnapshotSchema>;
