import 'server-only';

import { requireUser } from '@/lib/auth/server';
import type { Database } from '@/lib/supabase/db.types';
import { createClient } from '@/lib/supabase/server';
import type {
    AutomatonProjectSnapshot,
    GraphProjectSnapshot,
    PaintProjectSnapshot,
    WorkspaceModule,
} from '@/lib/workspace/projectPersistence.schemas';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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
        throw new Error('Projeto invalido ou nao pertence ao usuario autenticado.');
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

    const { error: projectError } = await supabase.from('graph_projects').upsert({
        project_id: projectId,
        directed: snapshot.directed,
        snap_to_grid: snapshot.snapToGrid,
        grid_size: snapshot.gridSize,
        canvas_width: snapshot.canvasWidth,
        canvas_height: snapshot.canvasHeight,
        view_offset_x: snapshot.viewOffset.x,
        view_offset_y: snapshot.viewOffset.y,
        zoom: snapshot.zoom,
    });
    if (projectError) throw projectError;

    const { error: deleteEdgesError } = await supabase
        .from('graph_edges')
        .delete()
        .eq('project_id', projectId);
    if (deleteEdgesError) throw deleteEdgesError;

    const { error: deleteNodesError } = await supabase
        .from('graph_nodes')
        .delete()
        .eq('project_id', projectId);
    if (deleteNodesError) throw deleteNodesError;

    if (snapshot.nodes.length > 0) {
        const { error: insertNodesError } = await supabase.from('graph_nodes').insert(
            snapshot.nodes.map((node) => ({
                project_id: projectId,
                node_id: node.id,
                x: node.x,
                y: node.y,
                label: node.label,
            }))
        );
        if (insertNodesError) throw insertNodesError;
    }

    if (snapshot.edges.length > 0) {
        const { error: insertEdgesError } = await supabase.from('graph_edges').insert(
            snapshot.edges.map((edge) => ({
                project_id: projectId,
                edge_id: edge.id,
                source_node_id: edge.source,
                target_node_id: edge.target,
                weight: edge.weight,
            }))
        );
        if (insertEdgesError) throw insertEdgesError;
    }
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

    const { error: projectError } = await supabase.from('automaton_projects').upsert({
        project_id: projectId,
        automaton_type: snapshot.automatonType,
        snap_to_grid: snapshot.snapToGrid,
        grid_size: snapshot.gridSize,
        canvas_width: snapshot.canvasWidth,
        canvas_height: snapshot.canvasHeight,
        view_offset_x: snapshot.viewOffset.x,
        view_offset_y: snapshot.viewOffset.y,
        zoom: snapshot.zoom,
    });
    if (projectError) throw projectError;

    const { error: deleteTransitionsError } = await supabase
        .from('automaton_transitions')
        .delete()
        .eq('project_id', projectId);
    if (deleteTransitionsError) throw deleteTransitionsError;

    const { error: deleteStatesError } = await supabase
        .from('automaton_states')
        .delete()
        .eq('project_id', projectId);
    if (deleteStatesError) throw deleteStatesError;

    if (snapshot.states.length > 0) {
        const { error: insertStatesError } = await supabase.from('automaton_states').insert(
            snapshot.states.map((state) => ({
                project_id: projectId,
                state_id: state.id,
                x: state.x,
                y: state.y,
                label: state.label,
                is_initial: state.isInitial,
                is_final: state.isFinal,
            }))
        );
        if (insertStatesError) throw insertStatesError;
    }

    if (snapshot.transitions.length > 0) {
        const { error: insertTransitionsError } = await supabase.from('automaton_transitions').insert(
            snapshot.transitions.map((transition) => ({
                project_id: projectId,
                transition_id: transition.id,
                source_state_id: transition.source,
                target_state_id: transition.target,
                symbol: transition.symbol,
                stack_pop: transition.stackPop ?? null,
                stack_push: transition.stackPush ?? null,
            }))
        );
        if (insertTransitionsError) throw insertTransitionsError;
    }
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

    const { error: projectError } = await supabase.from('paint_projects').upsert({
        project_id: projectId,
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
    });
    if (projectError) throw projectError;

    const { error: deleteSceneError } = await supabase
        .from('paint_scene_items')
        .delete()
        .eq('project_id', projectId);
    if (deleteSceneError) throw deleteSceneError;

    if (snapshot.scene.length === 0) {
        return;
    }

    const sceneItems: Database['public']['Tables']['paint_scene_items']['Insert'][] = snapshot.scene.map((item) => ({
        project_id: projectId,
        position: item.position,
        kind: item.kind,
        data: item.data as Database['public']['Tables']['paint_scene_items']['Insert']['data'],
        snapshot_path: null,
    }));

    const { error: insertSceneError } = await supabase.from('paint_scene_items').insert(sceneItems);
    if (insertSceneError) throw insertSceneError;
}
