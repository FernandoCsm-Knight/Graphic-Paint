-- ═══════════════════════════════════════════════════════════════════
-- SALVAMENTO ATÔMICO DE PROJETOS
-- ═══════════════════════════════════════════════════════════════════
-- Cada função grava as configurações do projeto e substitui todos os
-- itens (apagar + inserir) dentro de UMA transação: se qualquer passo
-- falhar, nada é alterado e o projeto anterior continua intacto.
--
-- SECURITY INVOKER: as políticas RLS das tabelas continuam valendo.
-- A checagem explícita de dono dá um erro claro antes de tocar nas tabelas.

-- ─── Paint ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION save_paint_project(
    p_project_id uuid,
    p_settings   jsonb,
    p_scene      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM projects
        WHERE id = p_project_id AND user_id = auth.uid() AND module = 'paint'
    ) THEN
        RAISE EXCEPTION 'Projeto invalido ou nao pertence ao usuario autenticado.'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO paint_projects (
        project_id, canvas_width, canvas_height, pixelated, pixel_size,
        view_offset_x, view_offset_y, zoom, line_algorithm, grid_display,
        clip_algorithm, line_dash, brush_style, placement_mode
    )
    VALUES (
        p_project_id,
        (p_settings->>'canvas_width')::int,
        (p_settings->>'canvas_height')::int,
        (p_settings->>'pixelated')::boolean,
        (p_settings->>'pixel_size')::int,
        (p_settings->>'view_offset_x')::float8,
        (p_settings->>'view_offset_y')::float8,
        (p_settings->>'zoom')::float8,
        p_settings->>'line_algorithm',
        p_settings->>'grid_display',
        p_settings->>'clip_algorithm',
        p_settings->>'line_dash',
        p_settings->>'brush_style',
        p_settings->>'placement_mode'
    )
    ON CONFLICT (project_id) DO UPDATE SET
        canvas_width   = EXCLUDED.canvas_width,
        canvas_height  = EXCLUDED.canvas_height,
        pixelated      = EXCLUDED.pixelated,
        pixel_size     = EXCLUDED.pixel_size,
        view_offset_x  = EXCLUDED.view_offset_x,
        view_offset_y  = EXCLUDED.view_offset_y,
        zoom           = EXCLUDED.zoom,
        line_algorithm = EXCLUDED.line_algorithm,
        grid_display   = EXCLUDED.grid_display,
        clip_algorithm = EXCLUDED.clip_algorithm,
        line_dash      = EXCLUDED.line_dash,
        brush_style    = EXCLUDED.brush_style,
        placement_mode = EXCLUDED.placement_mode;

    DELETE FROM paint_scene_items WHERE project_id = p_project_id;

    INSERT INTO paint_scene_items (project_id, position, kind, data, snapshot_path)
    SELECT
        p_project_id,
        (item->>'position')::int,
        item->>'kind',
        COALESCE(item->'data', '{}'::jsonb),
        NULL
    FROM jsonb_array_elements(COALESCE(p_scene, '[]'::jsonb)) AS item;
END;
$$;

-- ─── Grafo ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION save_graph_project(
    p_project_id uuid,
    p_settings   jsonb,
    p_nodes      jsonb,
    p_edges      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM projects
        WHERE id = p_project_id AND user_id = auth.uid() AND module = 'graph'
    ) THEN
        RAISE EXCEPTION 'Projeto invalido ou nao pertence ao usuario autenticado.'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO graph_projects (
        project_id, directed, snap_to_grid, grid_size, canvas_width,
        canvas_height, view_offset_x, view_offset_y, zoom
    )
    VALUES (
        p_project_id,
        (p_settings->>'directed')::boolean,
        (p_settings->>'snap_to_grid')::boolean,
        (p_settings->>'grid_size')::int,
        (p_settings->>'canvas_width')::float8,
        (p_settings->>'canvas_height')::float8,
        (p_settings->>'view_offset_x')::float8,
        (p_settings->>'view_offset_y')::float8,
        (p_settings->>'zoom')::float8
    )
    ON CONFLICT (project_id) DO UPDATE SET
        directed      = EXCLUDED.directed,
        snap_to_grid  = EXCLUDED.snap_to_grid,
        grid_size     = EXCLUDED.grid_size,
        canvas_width  = EXCLUDED.canvas_width,
        canvas_height = EXCLUDED.canvas_height,
        view_offset_x = EXCLUDED.view_offset_x,
        view_offset_y = EXCLUDED.view_offset_y,
        zoom          = EXCLUDED.zoom;

    DELETE FROM graph_edges WHERE project_id = p_project_id;
    DELETE FROM graph_nodes WHERE project_id = p_project_id;

    INSERT INTO graph_nodes (project_id, node_id, x, y, label)
    SELECT
        p_project_id,
        node->>'node_id',
        (node->>'x')::float8,
        (node->>'y')::float8,
        COALESCE(node->>'label', '')
    FROM jsonb_array_elements(COALESCE(p_nodes, '[]'::jsonb)) AS node;

    INSERT INTO graph_edges (project_id, edge_id, source_node_id, target_node_id, weight)
    SELECT
        p_project_id,
        edge->>'edge_id',
        edge->>'source_node_id',
        edge->>'target_node_id',
        (edge->>'weight')::float8
    FROM jsonb_array_elements(COALESCE(p_edges, '[]'::jsonb)) AS edge;
END;
$$;

-- ─── Autômato ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION save_automaton_project(
    p_project_id  uuid,
    p_settings    jsonb,
    p_states      jsonb,
    p_transitions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM projects
        WHERE id = p_project_id AND user_id = auth.uid() AND module = 'automaton'
    ) THEN
        RAISE EXCEPTION 'Projeto invalido ou nao pertence ao usuario autenticado.'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO automaton_projects (
        project_id, automaton_type, snap_to_grid, grid_size, canvas_width,
        canvas_height, view_offset_x, view_offset_y, zoom
    )
    VALUES (
        p_project_id,
        p_settings->>'automaton_type',
        (p_settings->>'snap_to_grid')::boolean,
        (p_settings->>'grid_size')::int,
        (p_settings->>'canvas_width')::float8,
        (p_settings->>'canvas_height')::float8,
        (p_settings->>'view_offset_x')::float8,
        (p_settings->>'view_offset_y')::float8,
        (p_settings->>'zoom')::float8
    )
    ON CONFLICT (project_id) DO UPDATE SET
        automaton_type = EXCLUDED.automaton_type,
        snap_to_grid   = EXCLUDED.snap_to_grid,
        grid_size      = EXCLUDED.grid_size,
        canvas_width   = EXCLUDED.canvas_width,
        canvas_height  = EXCLUDED.canvas_height,
        view_offset_x  = EXCLUDED.view_offset_x,
        view_offset_y  = EXCLUDED.view_offset_y,
        zoom           = EXCLUDED.zoom;

    DELETE FROM automaton_transitions WHERE project_id = p_project_id;
    DELETE FROM automaton_states WHERE project_id = p_project_id;

    INSERT INTO automaton_states (project_id, state_id, x, y, label, is_initial, is_final)
    SELECT
        p_project_id,
        state->>'state_id',
        (state->>'x')::float8,
        (state->>'y')::float8,
        COALESCE(state->>'label', ''),
        COALESCE((state->>'is_initial')::boolean, false),
        COALESCE((state->>'is_final')::boolean, false)
    FROM jsonb_array_elements(COALESCE(p_states, '[]'::jsonb)) AS state;

    INSERT INTO automaton_transitions (
        project_id, transition_id, source_state_id, target_state_id,
        symbol, stack_pop, stack_push
    )
    SELECT
        p_project_id,
        transition->>'transition_id',
        transition->>'source_state_id',
        transition->>'target_state_id',
        COALESCE(transition->>'symbol', ''),
        transition->>'stack_pop',
        transition->>'stack_push'
    FROM jsonb_array_elements(COALESCE(p_transitions, '[]'::jsonb)) AS transition;
END;
$$;

REVOKE ALL ON FUNCTION save_paint_project(uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION save_graph_project(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION save_automaton_project(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION save_paint_project(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION save_graph_project(uuid, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION save_automaton_project(uuid, jsonb, jsonb, jsonb) TO authenticated;
