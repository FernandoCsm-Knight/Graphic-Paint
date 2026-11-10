-- ═══════════════════════════════════════════════════════════════════
-- 0. EXTENSÃO
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ═══════════════════════════════════════════════════════════════════
-- 1. TRIGGER updated_at (reutilizado por todas as tabelas)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 2. WORKSPACE — PASTAS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE folders (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    parent_id   uuid        REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_user_id   ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

CREATE TRIGGER trg_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders: owner full access" ON folders
    FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 3. WORKSPACE — PROJETOS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE projects (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    folder_id   uuid        REFERENCES folders(id) ON DELETE SET NULL ON UPDATE CASCADE,
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
    module      text        NOT NULL CHECK (module IN ('paint', 'graph', 'automaton')),
    visibility  text        NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_id   ON projects(user_id);
CREATE INDEX idx_projects_folder_id ON projects(folder_id);
CREATE INDEX idx_projects_module    ON projects(module);

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: owner full access" ON projects
    FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Projetos públicos podem ser lidos por qualquer usuário autenticado (futuro)
CREATE POLICY "projects: public read" ON projects
    FOR SELECT
    USING (visibility = 'public');


-- ═══════════════════════════════════════════════════════════════════
-- 3.1 INTEGRIDADE DE DONO ENTRE PASTAS E PROJETOS
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION enforce_folder_parent_ownership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    parent_owner uuid;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT user_id
      INTO parent_owner
      FROM folders
     WHERE id = NEW.parent_id;

    IF parent_owner IS NULL THEN
        RAISE EXCEPTION 'Parent folder does not exist.';
    END IF;

    IF parent_owner <> NEW.user_id THEN
        RAISE EXCEPTION 'Parent folder must belong to the same user.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_project_folder_ownership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    folder_owner uuid;
BEGIN
    IF NEW.folder_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT user_id
      INTO folder_owner
      FROM folders
     WHERE id = NEW.folder_id;

    IF folder_owner IS NULL THEN
        RAISE EXCEPTION 'Folder does not exist.';
    END IF;

    IF folder_owner <> NEW.user_id THEN
        RAISE EXCEPTION 'Project folder must belong to the same user.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_folders_parent_ownership
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION enforce_folder_parent_ownership();

CREATE TRIGGER trg_projects_folder_ownership
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION enforce_project_folder_ownership();


-- ═══════════════════════════════════════════════════════════════════
-- 4. PAINT — METADADOS DO PROJETO
-- ═══════════════════════════════════════════════════════════════════
-- Armazena tamanho do canvas, estado da câmera e configurações de ferramentas.
CREATE TABLE paint_projects (
    project_id      uuid    PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- Tamanho do canvas (worldSize / canvasSize)
    canvas_width    int     NOT NULL DEFAULT 2400 CHECK (canvas_width  > 0),
    canvas_height   int     NOT NULL DEFAULT 1600 CHECK (canvas_height > 0),

    -- Modo pixel
    pixelated       boolean NOT NULL DEFAULT false,
    pixel_size      int     NOT NULL DEFAULT 20   CHECK (pixel_size > 0),

    -- Câmera (viewOffset + zoom)
    view_offset_x   float8  NOT NULL DEFAULT 0,
    view_offset_y   float8  NOT NULL DEFAULT 0,
    zoom            float8  NOT NULL DEFAULT 1    CHECK (zoom > 0),

    -- Configurações de ferramentas (SettingsContext)
    line_algorithm  text    NOT NULL DEFAULT 'bresenham'
                            CHECK (line_algorithm  IN ('bresenham', 'dda')),
    grid_display    text    NOT NULL DEFAULT 'none'
                            CHECK (grid_display    IN ('behind', 'front', 'none')),
    clip_algorithm  text    NOT NULL DEFAULT 'cohen-sutherland'
                            CHECK (clip_algorithm  IN ('cohen-sutherland', 'liang-barsky', 'sutherland-hodgman')),
    line_dash       text    NOT NULL DEFAULT 'solid'
                            CHECK (line_dash       IN ('solid', 'dashed', 'dotted')),
    brush_style     text    NOT NULL DEFAULT 'hard'
                            CHECK (brush_style     IN ('smooth', 'hard', 'spray')),
    placement_mode  text    NOT NULL DEFAULT 'bbox'
                            CHECK (placement_mode  IN ('bbox', 'vertices'))
);

ALTER TABLE paint_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paint_projects: owner full access" ON paint_projects
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "paint_projects: public read" ON paint_projects
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 5. PAINT — ITENS DA CENA
-- ═══════════════════════════════════════════════════════════════════
-- Cada linha é um SceneItem na ordem exata de renderização (ORDER BY position).
--
-- Coluna `kind` — discriminador:
--   Shapes vetoriais : 'line' | 'arrow' | 'rect' | 'square' | 'circle' | 'ellipse'
--                      'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'heptagon'
--                      'octagon' | 'star' | 'polygon' | 'image' | 'group'
--   Itens especiais  : 'freeform' | 'floodfill' | 'clearrect' | 'checkpoint'
--
-- Coluna `data` JSONB — campos por kind:
--
--   Campos comuns (Shape): strokeStyle, fillStyle, lineWidth, filled,
--                          pixelated, pixelSize, lineAlgorithm, lineDash[], rotation
--
--   line / arrow  : start{x,y}, end{x,y}
--   rect / square : topLeft{x,y}, bottomRight{x,y}
--   circle        : center{x,y}, radius
--   ellipse       : center{x,y}, radiusX, radiusY
--   triangle…star : points[{x,y}]
--   polygon       : points[{x,y}]
--   image         : x, y, width, height           → bitmap em snapshot_path
--   group         : rotation, shapes[...items]    → shapes aninhadas como JSONB
--   freeform      : strokeStyle, lineWidth, pixelated, pixelSize,
--                   lineAlgorithm, lineDash[], brushStyle, isEraser,
--                   filled, points[{x,y}]         → snapshot em snapshot_path
--   floodfill     : strokeStyle, pixelated, pixelSize, isEraser,
--                   algorithm, point{x,y}          → snapshot em snapshot_path
--   clearrect     : x, y, w, h
--   checkpoint    : {}                             → bitmap em snapshot_path
--
-- Coluna `snapshot_path` — caminho no bucket "paint-assets":
--   {user_id}/{project_id}/{id}.png
--   Preenchida apenas para: freeform, floodfill, image, checkpoint.

CREATE TABLE paint_scene_items (
    id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      uuid    NOT NULL REFERENCES paint_projects(project_id)
                            ON DELETE CASCADE ON UPDATE CASCADE,
    position        int     NOT NULL CHECK (position >= 0),
    kind            text    NOT NULL,
    data            jsonb   NOT NULL DEFAULT '{}',
    snapshot_path   text,

    UNIQUE (project_id, position)
);

CREATE INDEX idx_paint_scene_project_pos ON paint_scene_items(project_id, position);

ALTER TABLE paint_scene_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paint_scene_items: owner full access" ON paint_scene_items
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "paint_scene_items: public read" ON paint_scene_items
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 6. GRAPH — METADADOS DO PROJETO
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE graph_projects (
    project_id      uuid    PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,

    directed        boolean NOT NULL DEFAULT false,
    snap_to_grid    boolean NOT NULL DEFAULT false,
    grid_size       int     NOT NULL DEFAULT 20 CHECK (grid_size > 0),

    -- Câmera (DiagramWorkspaceContext)
    canvas_width    float8  NOT NULL DEFAULT 800,
    canvas_height   float8  NOT NULL DEFAULT 600,
    view_offset_x   float8  NOT NULL DEFAULT 0,
    view_offset_y   float8  NOT NULL DEFAULT 0,
    zoom            float8  NOT NULL DEFAULT 1 CHECK (zoom > 0)
);

ALTER TABLE graph_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graph_projects: owner full access" ON graph_projects
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "graph_projects: public read" ON graph_projects
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 7. GRAPH — NÓS
-- ═══════════════════════════════════════════════════════════════════
-- `node_id` é o ID gerado pelo app (string), preservado para que as
-- referências de arestas continuem coerentes ao recarregar.
CREATE TABLE graph_nodes (
    id          uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  uuid    NOT NULL REFERENCES graph_projects(project_id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    node_id     text    NOT NULL,
    x           float8  NOT NULL,
    y           float8  NOT NULL,
    label       text    NOT NULL DEFAULT '',

    UNIQUE (project_id, node_id)
);

CREATE INDEX idx_graph_nodes_project ON graph_nodes(project_id);

ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graph_nodes: owner full access" ON graph_nodes
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "graph_nodes: public read" ON graph_nodes
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 8. GRAPH — ARESTAS
-- ═══════════════════════════════════════════════════════════════════
-- FK composta (project_id, node_id) garante que source/target existem
-- no mesmo projeto; deleção de nó cascateia para as arestas.
CREATE TABLE graph_edges (
    id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      uuid    NOT NULL REFERENCES graph_projects(project_id)
                            ON DELETE CASCADE ON UPDATE CASCADE,
    edge_id         text    NOT NULL,
    source_node_id  text    NOT NULL,
    target_node_id  text    NOT NULL,
    weight          float8,               -- NULL = grafo não-ponderado

    UNIQUE (project_id, edge_id),

    FOREIGN KEY (project_id, source_node_id)
        REFERENCES graph_nodes(project_id, node_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (project_id, target_node_id)
        REFERENCES graph_nodes(project_id, node_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_graph_edges_project ON graph_edges(project_id);

ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graph_edges: owner full access" ON graph_edges
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "graph_edges: public read" ON graph_edges
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 9. AUTOMATON — METADADOS DO PROJETO
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE automaton_projects (
    project_id      uuid    PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,

    automaton_type  text    NOT NULL DEFAULT 'AFN_LAMBDA'
                            CHECK (automaton_type IN ('AFN_LAMBDA', 'PUSHDOWN')),
    snap_to_grid    boolean NOT NULL DEFAULT false,
    grid_size       int     NOT NULL DEFAULT 20 CHECK (grid_size > 0),

    canvas_width    float8  NOT NULL DEFAULT 800,
    canvas_height   float8  NOT NULL DEFAULT 600,
    view_offset_x   float8  NOT NULL DEFAULT 0,
    view_offset_y   float8  NOT NULL DEFAULT 0,
    zoom            float8  NOT NULL DEFAULT 1 CHECK (zoom > 0)
);

ALTER TABLE automaton_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automaton_projects: owner full access" ON automaton_projects
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "automaton_projects: public read" ON automaton_projects
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 10. AUTOMATON — ESTADOS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE automaton_states (
    id          uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  uuid    NOT NULL REFERENCES automaton_projects(project_id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    state_id    text    NOT NULL,
    x           float8  NOT NULL,
    y           float8  NOT NULL,
    label       text    NOT NULL DEFAULT '',
    is_initial  boolean NOT NULL DEFAULT false,
    is_final    boolean NOT NULL DEFAULT false,

    UNIQUE (project_id, state_id)
);

CREATE INDEX idx_automaton_states_project ON automaton_states(project_id);

ALTER TABLE automaton_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automaton_states: owner full access" ON automaton_states
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "automaton_states: public read" ON automaton_states
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


-- ═══════════════════════════════════════════════════════════════════
-- 11. AUTOMATON — TRANSIÇÕES
-- ═══════════════════════════════════════════════════════════════════
-- stack_pop / stack_push são NULL para AFN-λ e preenchidos para PDA.
-- FK composta garante que source/target existem no mesmo projeto.
CREATE TABLE automaton_transitions (
    id                uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id        uuid    NOT NULL REFERENCES automaton_projects(project_id)
                              ON DELETE CASCADE ON UPDATE CASCADE,
    transition_id     text    NOT NULL,
    source_state_id   text    NOT NULL,
    target_state_id   text    NOT NULL,
    symbol            text    NOT NULL DEFAULT '',  -- '' = lambda / epsilon
    stack_pop         text,                         -- PDA: símbolo a desempilhar (NULL para AFN)
    stack_push        text,                         -- PDA: símbolo(s) a empilhar  (NULL para AFN)

    UNIQUE (project_id, transition_id),

    FOREIGN KEY (project_id, source_state_id)
        REFERENCES automaton_states(project_id, state_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (project_id, target_state_id)
        REFERENCES automaton_states(project_id, state_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_automaton_transitions_project ON automaton_transitions(project_id);

ALTER TABLE automaton_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automaton_transitions: owner full access" ON automaton_transitions
    FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "automaton_transitions: public read" ON automaton_transitions
    FOR SELECT
    USING (
        project_id IN (SELECT id FROM projects WHERE visibility = 'public')
    );


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


-- ═══════════════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════════════
-- Criar manualmente no dashboard: Storage → New bucket → "paint-assets" (privado)
--
-- Padrão de path: {user_id}/{project_id}/{scene_item_id}.png
--
-- Políticas de Storage sugeridas (via dashboard ou SQL de storage):
--
-- INSERT: auth.uid()::text = (storage.foldername(name))[1]
-- SELECT: auth.uid()::text = (storage.foldername(name))[1]
--      OR EXISTS (
--             SELECT 1 FROM projects
--             WHERE projects.id::text = (storage.foldername(name))[2]
--             AND projects.visibility = 'public'
--         )
-- DELETE: auth.uid()::text = (storage.foldername(name))[1]
