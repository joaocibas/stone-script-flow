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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          specific_date: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          specific_date?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          specific_date?: string | null
          start_time?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          address: string
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_time: string | null
          reservation_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          deposit_paid: number
          id: string
          notes: string | null
          quote_id: string | null
          slab_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          deposit_paid?: number
          id?: string
          notes?: string | null
          quote_id?: string | null
          slab_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          deposit_paid?: number
          id?: string
          notes?: string | null
          quote_id?: string | null
          slab_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_slab_id_fkey"
            columns: ["slab_id"]
            isOneToOne: false
            referencedRelation: "slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          created_at: string
          cutout_cost: number
          edge_profile_cost: number
          id: string
          is_active: boolean
          labor_rate_per_sqft: number
          material_id: string
          price_per_sqft: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cutout_cost?: number
          edge_profile_cost?: number
          id?: string
          is_active?: boolean
          labor_rate_per_sqft?: number
          material_id: string
          price_per_sqft: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cutout_cost?: number
          edge_profile_cost?: number
          id?: string
          is_active?: boolean
          labor_rate_per_sqft?: number
          material_id?: string
          price_per_sqft?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          calculated_sqft: number | null
          created_at: string
          customer_id: string | null
          edge_profile: string | null
          estimated_total: number | null
          id: string
          layout_url: string | null
          length_inches: number
          material_id: string
          num_cutouts: number
          range_max: number | null
          range_min: number | null
          reference_measurement_inches: number | null
          slab_category: string | null
          slabs_needed: number | null
          status: Database["public"]["Enums"]["quote_status"]
          width_inches: number
        }
        Insert: {
          calculated_sqft?: number | null
          created_at?: string
          customer_id?: string | null
          edge_profile?: string | null
          estimated_total?: number | null
          id?: string
          layout_url?: string | null
          length_inches: number
          material_id: string
          num_cutouts?: number
          range_max?: number | null
          range_min?: number | null
          reference_measurement_inches?: number | null
          slab_category?: string | null
          slabs_needed?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          width_inches: number
        }
        Update: {
          calculated_sqft?: number | null
          created_at?: string
          customer_id?: string | null
          edge_profile?: string | null
          estimated_total?: number | null
          id?: string
          layout_url?: string | null
          length_inches?: number
          material_id?: string
          num_cutouts?: number
          range_max?: number | null
          range_min?: number | null
          reference_measurement_inches?: number | null
          slab_category?: string | null
          slabs_needed?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          width_inches?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          customer_id: string
          deposit_amount: number
          id: string
          reserved_at: string
          reserved_until: string
          slab_id: string
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          created_at?: string
          customer_id: string
          deposit_amount: number
          id?: string
          reserved_at?: string
          reserved_until: string
          slab_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          created_at?: string
          customer_id?: string
          deposit_amount?: number
          id?: string
          reserved_at?: string
          reserved_until?: string
          slab_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_slab_id_fkey"
            columns: ["slab_id"]
            isOneToOne: false
            referencedRelation: "slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          zip_code: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          zip_code: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          zip_code?: string
        }
        Relationships: []
      }
      sla_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          breach_type: string
          breached_at: string
          id: string
          reservation_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          breach_type: string
          breached_at?: string
          id?: string
          reservation_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          breach_type?: string
          breached_at?: string
          id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_alerts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_events: {
        Row: {
          event_type: string
          id: string
          occurred_at: string
          reservation_id: string
        }
        Insert: {
          event_type: string
          id?: string
          occurred_at?: string
          reservation_id: string
        }
        Update: {
          event_type?: string
          id?: string
          occurred_at?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      slabs: {
        Row: {
          created_at: string
          id: string
          image_urls: string[] | null
          length_inches: number
          lot_number: string | null
          material_id: string
          notes: string | null
          status: Database["public"]["Enums"]["slab_status"]
          thickness: string
          updated_at: string
          width_inches: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_urls?: string[] | null
          length_inches: number
          lot_number?: string | null
          material_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["slab_status"]
          thickness?: string
          updated_at?: string
          width_inches: number
        }
        Update: {
          created_at?: string
          id?: string
          image_urls?: string[] | null
          length_inches?: number
          lot_number?: string | null
          material_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["slab_status"]
          thickness?: string
          updated_at?: string
          width_inches?: number
        }
        Relationships: [
          {
            foreignKeyName: "slabs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      appointment_status: "requested" | "confirmed" | "completed" | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      quote_status: "pending" | "calculated" | "expired"
      reservation_status: "active" | "expired" | "cancelled" | "converted"
      slab_status: "available" | "reserved" | "sold" | "archived"
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
      app_role: ["admin", "customer"],
      appointment_status: ["requested", "confirmed", "completed", "cancelled"],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      quote_status: ["pending", "calculated", "expired"],
      reservation_status: ["active", "expired", "cancelled", "converted"],
      slab_status: ["available", "reserved", "sold", "archived"],
    },
  },
} as const
