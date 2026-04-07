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
    PostgrestVersion: "13.0.5"
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
      inventory_items: {
        Row: {
          accessories: string | null
          category: string
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          dmx_channels: number | null
          dmx_start_address: number | null
          dmx_universe: number | null
          id: string
          image_url: string | null
          lent_to: string | null
          lent_until: string | null
          location: string
          name: string
          notes: string | null
          quantity: number
          unit_price: number | null
          updated_at: string
          user_id: string
          deleted_at?: string | null
        }
        Insert: {
          accessories?: string | null
          category: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          dmx_channels?: number | null
          dmx_start_address?: number | null
          dmx_universe?: number | null
          id?: string
          image_url?: string | null
          lent_to?: string | null
          lent_until?: string | null
          location: string
          name: string
          notes?: string | null
          quantity?: number
          unit_price?: number | null
          updated_at?: string
          user_id: string
          deleted_at?: string | null
        }
        Update: {
          accessories?: string | null
          category?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          dmx_channels?: number | null
          dmx_start_address?: number | null
          dmx_universe?: number | null
          id?: string
          image_url?: string | null
          lent_to?: string | null
          lent_until?: string | null
          location?: string
          name?: string
          notes?: string | null
          quantity?: number
          unit_price?: number | null
          updated_at?: string
          user_id?: string
          deleted_at?: string | null
        }
        Relationships: []
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
      user_categories: {
        Row: {
          created_at: string
          id: string
          is_dmx_capable: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dmx_capable?: boolean
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dmx_capable?: boolean
          name?: string
          sort_order?: number
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
      item_category:
        | "Kabel"
        | "Lautsprecher"
        | "Lichttechnik"
        | "Mikrofone"
        | "Zubehör"
        | "Effektgeräte"
      item_condition: "verfügbar" | "verliehen" | "in-einsatz" | "defekt"
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
    Enums: {
      item_category: [
        "Kabel",
        "Lautsprecher",
        "Lichttechnik",
        "Mikrofone",
        "Zubehör",
        "Effektgeräte",
      ],
      item_condition: ["verfügbar", "verliehen", "in-einsatz", "defekt"],
    },
  },
} as const
