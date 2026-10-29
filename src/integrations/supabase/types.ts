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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          item_id: string | null
          item_name: string | null
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          icon: string
          id: string
          is_dmx_capable: boolean
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          icon?: string
          id: string
          is_dmx_capable?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          icon?: string
          id?: string
          is_dmx_capable?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_attributes: {
        Row: {
          attribute_key: string
          category_id: string
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attribute_key: string
          category_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attribute_key?: string
          category_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          id: string
          item_order: number
          notes: string | null
          status: string
          text: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          id?: string
          item_order?: number
          notes?: string | null
          status?: string
          text: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          id?: string
          item_order?: number
          notes?: string | null
          status?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string
          description: string | null
          event_name: string
          id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_name: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_name?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dmx_instances: {
        Row: {
          created_at: string
          dmx_start_address: number
          dmx_universe: number
          id: string
          instance_number: number
          item_id: string
        }
        Insert: {
          created_at?: string
          dmx_start_address: number
          dmx_universe?: number
          id?: string
          instance_number: number
          item_id: string
        }
        Update: {
          created_at?: string
          dmx_start_address?: number
          dmx_universe?: number
          id?: string
          instance_number?: number
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dmx_instances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      event_set_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          set_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          set_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_set_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "event_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sets: {
        Row: {
          created_at: string
          description: string | null
          event_date_end: string | null
          event_date_start: string | null
          id: string
          is_favorite: boolean
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date_end?: string | null
          event_date_start?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date_end?: string | null
          event_date_start?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string
          title: string
          votes: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          votes?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          votes?: number
        }
        Relationships: []
      }
      feature_votes: {
        Row: {
          created_at: string | null
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          accessories: string | null
          attributes: Json | null
          category: string
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          deleted_at: string | null
          dimensions_cm: Json | null
          dmx_channels: number | null
          dmx_start_address: number | null
          dmx_universe: number | null
          id: string
          image_url: string | null
          lent_to: string | null
          lent_until: string | null
          location: string
          maintenance_interval_days: number | null
          name: string
          notes: string | null
          quantity: number
          unit_price: number | null
          units_per_case: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          accessories?: string | null
          attributes?: Json | null
          category: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          deleted_at?: string | null
          dimensions_cm?: Json | null
          dmx_channels?: number | null
          dmx_start_address?: number | null
          dmx_universe?: number | null
          id?: string
          image_url?: string | null
          lent_to?: string | null
          lent_until?: string | null
          location: string
          maintenance_interval_days?: number | null
          name: string
          notes?: string | null
          quantity?: number
          unit_price?: number | null
          units_per_case?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          accessories?: string | null
          attributes?: Json | null
          category?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          deleted_at?: string | null
          dimensions_cm?: Json | null
          dmx_channels?: number | null
          dmx_start_address?: number | null
          dmx_universe?: number | null
          id?: string
          image_url?: string | null
          lent_to?: string | null
          lent_until?: string | null
          location?: string
          maintenance_interval_days?: number | null
          name?: string
          notes?: string | null
          quantity?: number
          unit_price?: number | null
          units_per_case?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      item_tags: {
        Row: {
          item_id: string
          tag_id: string
        }
        Insert: {
          item_id: string
          tag_id: string
        }
        Update: {
          item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lending_history: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          item_id: string
          item_name: string
          lent_at: string
          lent_to: string
          notes: string | null
          returned_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          item_id: string
          item_name: string
          lent_at?: string
          lent_to: string
          notes?: string | null
          returned_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          item_id?: string
          item_name?: string
          lent_at?: string
          lent_to?: string
          notes?: string | null
          returned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lending_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          image_url: string | null
          item_id: string
          notes: string | null
          performed_at: string
          type: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_id: string
          notes?: string | null
          performed_at?: string
          type?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_id?: string
          notes?: string | null
          performed_at?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      package_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          package_id: string
          position: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          package_id: string
          position?: number
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          package_id?: string
          position?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_dmx_instances: {
        Row: {
          created_at: string
          dmx_start_address: number
          dmx_universe: number
          id: string
          instance_number: number
          item_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dmx_start_address: number
          dmx_universe?: number
          id?: string
          instance_number?: number
          item_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dmx_start_address?: number
          dmx_universe?: number
          id?: string
          instance_number?: number
          item_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_dmx_instances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dmx_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dmx_patches: {
        Row: {
          created_at: string
          dmx_start_address: number
          dmx_universe: number
          id: string
          instance_number: number
          inventory_item_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dmx_start_address: number
          dmx_universe?: number
          id?: string
          instance_number?: number
          inventory_item_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dmx_start_address?: number
          dmx_universe?: number
          id?: string
          instance_number?: number
          inventory_item_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_dmx_patches_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dmx_patches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          original_location: string | null
          package_instance_id: string | null
          packed: boolean
          project_id: string
          quantity: number
          source: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          original_location?: string | null
          package_instance_id?: string | null
          packed?: boolean
          project_id: string
          quantity?: number
          source?: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          original_location?: string | null
          package_instance_id?: string | null
          packed?: boolean
          project_id?: string
          quantity?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_package_instance_id_fkey"
            columns: ["package_instance_id"]
            isOneToOne: false
            referencedRelation: "project_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_packages: {
        Row: {
          added_at: string
          id: string
          package_id: string
          project_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          package_id: string
          project_id: string
        }
        Update: {
          added_at?: string
          id?: string
          package_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_todos: {
        Row: {
          assigned_to: string | null
          created_at: string
          done: boolean
          id: string
          position: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          done?: boolean
          id?: string
          position?: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          done?: boolean
          id?: string
          position?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_todos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          event_date_end: string | null
          event_date_start: string | null
          id: string
          is_favorite: boolean
          location: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date_end?: string | null
          event_date_start?: string | null
          id?: string
          is_favorite?: boolean
          location?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date_end?: string | null
          event_date_start?: string | null
          id?: string
          is_favorite?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_demo_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      item_condition: "verf??gbar" | "verliehen" | "in-einsatz" | "defekt"
      project_status:
        | "draft"
        | "planned"
        | "packed"
        | "transit"
        | "live"
        | "returning"
        | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      item_condition: ["verf??gbar", "verliehen", "in-einsatz", "defekt"],
      project_status: [
        "draft",
        "planned",
        "packed",
        "transit",
        "live",
        "returning",
        "archived",
      ],
    },
  },
} as const
