export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      automaton_projects: {
        Row: {
          automaton_type: string
          canvas_height: number
          canvas_width: number
          grid_size: number
          project_id: string
          snap_to_grid: boolean
          view_offset_x: number
          view_offset_y: number
          zoom: number
        }
        Insert: {
          automaton_type?: string
          canvas_height?: number
          canvas_width?: number
          grid_size?: number
          project_id: string
          snap_to_grid?: boolean
          view_offset_x?: number
          view_offset_y?: number
          zoom?: number
        }
        Update: {
          automaton_type?: string
          canvas_height?: number
          canvas_width?: number
          grid_size?: number
          project_id?: string
          snap_to_grid?: boolean
          view_offset_x?: number
          view_offset_y?: number
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "automaton_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automaton_states: {
        Row: {
          id: string
          is_final: boolean
          is_initial: boolean
          label: string
          project_id: string
          state_id: string
          x: number
          y: number
        }
        Insert: {
          id?: string
          is_final?: boolean
          is_initial?: boolean
          label?: string
          project_id: string
          state_id: string
          x: number
          y: number
        }
        Update: {
          id?: string
          is_final?: boolean
          is_initial?: boolean
          label?: string
          project_id?: string
          state_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "automaton_states_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "automaton_projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      automaton_transitions: {
        Row: {
          id: string
          project_id: string
          source_state_id: string
          stack_pop: string | null
          stack_push: string | null
          symbol: string
          target_state_id: string
          transition_id: string
        }
        Insert: {
          id?: string
          project_id: string
          source_state_id: string
          stack_pop?: string | null
          stack_push?: string | null
          symbol?: string
          target_state_id: string
          transition_id: string
        }
        Update: {
          id?: string
          project_id?: string
          source_state_id?: string
          stack_pop?: string | null
          stack_push?: string | null
          symbol?: string
          target_state_id?: string
          transition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automaton_transitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "automaton_projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "automaton_transitions_project_id_source_state_id_fkey"
            columns: ["project_id", "source_state_id"]
            isOneToOne: false
            referencedRelation: "automaton_states"
            referencedColumns: ["project_id", "state_id"]
          },
          {
            foreignKeyName: "automaton_transitions_project_id_target_state_id_fkey"
            columns: ["project_id", "target_state_id"]
            isOneToOne: false
            referencedRelation: "automaton_states"
            referencedColumns: ["project_id", "state_id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      graph_edges: {
        Row: {
          edge_id: string
          id: string
          project_id: string
          source_node_id: string
          target_node_id: string
          weight: number | null
        }
        Insert: {
          edge_id: string
          id?: string
          project_id: string
          source_node_id: string
          target_node_id: string
          weight?: number | null
        }
        Update: {
          edge_id?: string
          id?: string
          project_id?: string
          source_node_id?: string
          target_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "graph_edges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "graph_projects"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "graph_edges_project_id_source_node_id_fkey"
            columns: ["project_id", "source_node_id"]
            isOneToOne: false
            referencedRelation: "graph_nodes"
            referencedColumns: ["project_id", "node_id"]
          },
          {
            foreignKeyName: "graph_edges_project_id_target_node_id_fkey"
            columns: ["project_id", "target_node_id"]
            isOneToOne: false
            referencedRelation: "graph_nodes"
            referencedColumns: ["project_id", "node_id"]
          },
        ]
      }
      graph_nodes: {
        Row: {
          id: string
          label: string
          node_id: string
          project_id: string
          x: number
          y: number
        }
        Insert: {
          id?: string
          label?: string
          node_id: string
          project_id: string
          x: number
          y: number
        }
        Update: {
          id?: string
          label?: string
          node_id?: string
          project_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "graph_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "graph_projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      graph_projects: {
        Row: {
          canvas_height: number
          canvas_width: number
          directed: boolean
          grid_size: number
          project_id: string
          snap_to_grid: boolean
          view_offset_x: number
          view_offset_y: number
          zoom: number
        }
        Insert: {
          canvas_height?: number
          canvas_width?: number
          directed?: boolean
          grid_size?: number
          project_id: string
          snap_to_grid?: boolean
          view_offset_x?: number
          view_offset_y?: number
          zoom?: number
        }
        Update: {
          canvas_height?: number
          canvas_width?: number
          directed?: boolean
          grid_size?: number
          project_id?: string
          snap_to_grid?: boolean
          view_offset_x?: number
          view_offset_y?: number
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "graph_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      paint_projects: {
        Row: {
          brush_style: string
          canvas_height: number
          canvas_width: number
          clip_algorithm: string
          grid_display: string
          line_algorithm: string
          line_dash: string
          pixel_size: number
          pixelated: boolean
          placement_mode: string
          project_id: string
          view_offset_x: number
          view_offset_y: number
          zoom: number
        }
        Insert: {
          brush_style?: string
          canvas_height?: number
          canvas_width?: number
          clip_algorithm?: string
          grid_display?: string
          line_algorithm?: string
          line_dash?: string
          pixel_size?: number
          pixelated?: boolean
          placement_mode?: string
          project_id: string
          view_offset_x?: number
          view_offset_y?: number
          zoom?: number
        }
        Update: {
          brush_style?: string
          canvas_height?: number
          canvas_width?: number
          clip_algorithm?: string
          grid_display?: string
          line_algorithm?: string
          line_dash?: string
          pixel_size?: number
          pixelated?: boolean
          placement_mode?: string
          project_id?: string
          view_offset_x?: number
          view_offset_y?: number
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "paint_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      paint_scene_items: {
        Row: {
          data: Json
          id: string
          kind: string
          position: number
          project_id: string
          snapshot_path: string | null
        }
        Insert: {
          data?: Json
          id?: string
          kind: string
          position: number
          project_id: string
          snapshot_path?: string | null
        }
        Update: {
          data?: Json
          id?: string
          kind?: string
          position?: number
          project_id?: string
          snapshot_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paint_scene_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "paint_projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          module: string
          name: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          module: string
          name: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          module?: string
          name?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
