import 'server-only';

import { requireUser } from '@/lib/auth/server';
import type { Json } from '@/lib/supabase/db.types';
import { createClient } from '@/lib/supabase/server';
import type {
    AutomatonProjectSnapshot,
    GraphProjectSnapshot,
    PaintProjectSnapshot,
    WorkspaceModule,
} from '@/lib/workspace/projectPersistence.schemas';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** The project does not exist, belongs to someone else or is from another module. */
export class ProjectAccessError extends Error {
    constructor() {
        super('Projeto invalido ou nao pertence ao usuario autenticado.');
        this.name = 'ProjectAccessError';
    }
}

/** Postgres error code raised by the save_* functions for ownership failures. */
const PROJECT_ACCESS_ERRCODE = 'P0002';

function throwRpcError(error: { code?: string } | null): void {
    if (!error) return;
    if (error.code === PROJECT_ACCESS_ERRCODE) throw new ProjectAccessError();
    throw error;
}

type OwnedProjectContext = {
    supabase: SupabaseServerClient;
    userId: string;
};

async function getOwnedProjectContext(
    projectId: string,
    module: WorkspaceModule,
): Promise<OwnedProjectContext> {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
        .from('projects')
        .select('id, module')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (error || !data || data.module !== module) {
        throw new ProjectAccessError();
    }

    return {
        supabase,
        userId: user.id,
    };
}

export async function getGraphProjectSnapshot(projectId: string): Promise<GraphProjectSnapshot> {
    const { supabase } = await getOwnedProjectContext(projectId, 'graph');
    const [projectResult, nodesResult, edgesResult] = await Promise.all([
        supabase
            .from('graph_projects')
            .select('*')
            .eq('project_id', projectId)
            .single(),
        supabase
            .from('graph_nodes')
            .select('*')
            .eq('project_id', projectId)
            .order('node_id'),
        supabase
            .from('graph_edges')
            .select('*')
            .eq('project_id', projectId)
            .order('edge_id'),
    ]);

    if (projectResult.error || !projectResult.data) {
        throw projectResult.error ?? new Error('Nao foi possivel carregar o projeto de grafo.');
    }
    if (nodesResult.error) throw nodesResult.error;
    if (edgesResult.error) throw edgesResult.error;

    return {
        directed: projectResult.data.directed,
        snapToGrid: projectResult.data.snap_to_grid,
        gridSize: projectResult.data.grid_size,
        canvasWidth: projectResult.data.canvas_width,
        canvasHeight: projectResult.data.canvas_height,
        viewOffset: {
            x: projectResult.data.view_offset_x,
            y: projectResult.data.view_offset_y,
        },
        zoom: projectResult.data.zoom,
        nodes: nodesResult.data.map((node) => ({
            id: node.node_id,
            x: node.x,
            y: node.y,
            label: node.label,
        })),
        edges: edgesResult.data.map((edge) => ({
            id: edge.edge_id,
            source: edge.source_node_id,
            target: edge.target_node_id,
            weight: edge.weight ?? 1,
        })),
    };
}

export async function saveGraphProjectSnapshot(
    projectId: string,
    snapshot: GraphProjectSnapshot,
): Promise<void> {
    const { supabase } = await getOwnedProjectContext(projectId, 'graph');

    // Settings + nodes + edges are replaced in a single transaction.
    const { error } = await supabase.rpc('save_graph_project', {
        p_project_id: projectId,
        p_settings: {
            directed: snapshot.directed,
            snap_to_grid: snapshot.snapToGrid,
            grid_size: snapshot.gridSize,
            canvas_width: snapshot.canvasWidth,
            canvas_height: snapshot.canvasHeight,
            view_offset_x: snapshot.viewOffset.x,
            view_offset_y: snapshot.viewOffset.y,
            zoom: snapshot.zoom,
        },
        p_nodes: snapshot.nodes.map((node) => ({
            node_id: node.id,
            x: node.x,
            y: node.y,
            label: node.label,
        })),
        p_edges: snapshot.edges.map((edge) => ({
            edge_id: edge.id,
            source_node_id: edge.source,
            target_node_id: edge.target,
            weight: edge.weight,
        })),
    });
    throwRpcError(error);
}

export async function getAutomatonProjectSnapshot(projectId: string): Promise<AutomatonProjectSnapshot> {
    const { supabase } = await getOwnedProjectContext(projectId, 'automaton');
    const [projectResult, statesResult, transitionsResult] = await Promise.all([
        supabase
            .from('automaton_projects')
            .select('*')
            .eq('project_id', projectId)
            .single(),
        supabase
            .from('automaton_states')
            .select('*')
            .eq('project_id', projectId)
            .order('state_id'),
        supabase
            .from('automaton_transitions')
            .select('*')
            .eq('project_id', projectId)
            .order('transition_id'),
    ]);

    if (projectResult.error || !projectResult.data) {
        throw projectResult.error ?? new Error('Nao foi possivel carregar o projeto de automato.');
    }
    if (statesResult.error) throw statesResult.error;
    if (transitionsResult.error) throw transitionsResult.error;

    return {
        automatonType: projectResult.data.automaton_type as AutomatonProjectSnapshot['automatonType'],
        snapToGrid: projectResult.data.snap_to_grid,
        gridSize: projectResult.data.grid_size,
        canvasWidth: projectResult.data.canvas_width,
        canvasHeight: projectResult.data.canvas_height,
        viewOffset: {
            x: projectResult.data.view_offset_x,
            y: projectResult.data.view_offset_y,
        },
        zoom: projectResult.data.zoom,
        states: statesResult.data.map((state) => ({
            id: state.state_id,
            x: state.x,
            y: state.y,
            label: state.label,
            isInitial: state.is_initial,
            isFinal: state.is_final,
        })),
        transitions: transitionsResult.data.map((transition) => ({
            id: transition.transition_id,
            source: transition.source_state_id,
            target: transition.target_state_id,
            symbol: transition.symbol,
            stackPop: transition.stack_pop ?? undefined,
            stackPush: transition.stack_push ?? undefined,
        })),
    };
}

export async function saveAutomatonProjectSnapshot(
    projectId: string,
    snapshot: AutomatonProjectSnapshot,
): Promise<void> {
    const { supabase } = await getOwnedProjectContext(projectId, 'automaton');

    // Settings + states + transitions are replaced in a single transaction.
    const { error } = await supabase.rpc('save_automaton_project', {
        p_project_id: projectId,
        p_settings: {
            automaton_type: snapshot.automatonType,
            snap_to_grid: snapshot.snapToGrid,
            grid_size: snapshot.gridSize,
            canvas_width: snapshot.canvasWidth,
            canvas_height: snapshot.canvasHeight,
            view_offset_x: snapshot.viewOffset.x,
            view_offset_y: snapshot.viewOffset.y,
            zoom: snapshot.zoom,
        },
        p_states: snapshot.states.map((state) => ({
            state_id: state.id,
            x: state.x,
            y: state.y,
            label: state.label,
            is_initial: state.isInitial,
            is_final: state.isFinal,
        })),
        p_transitions: snapshot.transitions.map((transition) => ({
            transition_id: transition.id,
            source_state_id: transition.source,
            target_state_id: transition.target,
            symbol: transition.symbol,
            stack_pop: transition.stackPop ?? null,
            stack_push: transition.stackPush ?? null,
        })),
    });
    throwRpcError(error);
}

export async function getPaintProjectSnapshot(projectId: string): Promise<PaintProjectSnapshot> {
    const { supabase } = await getOwnedProjectContext(projectId, 'paint');
    const [projectResult, sceneResult] = await Promise.all([
        supabase
            .from('paint_projects')
            .select('*')
            .eq('project_id', projectId)
            .single(),
        supabase
            .from('paint_scene_items')
            .select('position, kind, data')
            .eq('project_id', projectId)
            .order('position'),
    ]);

    if (projectResult.error || !projectResult.data) {
        throw projectResult.error ?? new Error('Nao foi possivel carregar o projeto de paint.');
    }
    if (sceneResult.error) throw sceneResult.error;

    return {
        canvasWidth: projectResult.data.canvas_width,
        canvasHeight: projectResult.data.canvas_height,
        pixelated: projectResult.data.pixelated,
        pixelSize: projectResult.data.pixel_size,
        viewOffset: {
            x: projectResult.data.view_offset_x,
            y: projectResult.data.view_offset_y,
        },
        zoom: projectResult.data.zoom,
        lineAlgorithm: projectResult.data.line_algorithm as PaintProjectSnapshot['lineAlgorithm'],
        gridDisplay: projectResult.data.grid_display as PaintProjectSnapshot['gridDisplay'],
        clipAlgorithm: projectResult.data.clip_algorithm as PaintProjectSnapshot['clipAlgorithm'],
        lineDash: projectResult.data.line_dash as PaintProjectSnapshot['lineDash'],
        brushStyle: projectResult.data.brush_style as PaintProjectSnapshot['brushStyle'],
        placementMode: projectResult.data.placement_mode as PaintProjectSnapshot['placementMode'],
        scene: sceneResult.data.map((item) => ({
            position: item.position,
            kind: item.kind,
            data: item.data,
        })),
    };
}

export async function savePaintProjectSnapshot(
    projectId: string,
    snapshot: PaintProjectSnapshot,
): Promise<void> {
    const { supabase } = await getOwnedProjectContext(projectId, 'paint');

    // Settings + scene items are replaced in a single transaction, so a failed
    // insert can no longer leave the project empty.
    const { error } = await supabase.rpc('save_paint_project', {
        p_project_id: projectId,
        p_settings: {
            canvas_width: snapshot.canvasWidth,
            canvas_height: snapshot.canvasHeight,
            pixelated: snapshot.pixelated,
            pixel_size: snapshot.pixelSize,
            view_offset_x: snapshot.viewOffset.x,
            view_offset_y: snapshot.viewOffset.y,
            zoom: snapshot.zoom,
            line_algorithm: snapshot.lineAlgorithm,
            grid_display: snapshot.gridDisplay,
            clip_algorithm: snapshot.clipAlgorithm,
            line_dash: snapshot.lineDash,
            brush_style: snapshot.brushStyle,
            placement_mode: snapshot.placementMode,
        },
        p_scene: snapshot.scene.map((item) => ({
            position: item.position,
            kind: item.kind,
            data: item.data,
        })) as Json,
    });
    throwRpcError(error);
}
