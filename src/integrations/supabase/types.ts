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
      admin_ai_reports: {
        Row: {
          created_at: string
          id: string
          model_used: string | null
          period: string
          report_type: string
          result_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          model_used?: string | null
          period?: string
          report_type: string
          result_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          model_used?: string | null
          period?: string
          report_type?: string
          result_json?: Json
        }
        Relationships: []
      }
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
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_deleted: boolean
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          addons_cost: number | null
          billing_address: string | null
          color: string | null
          created_at: string
          customer_name: string
          date: string
          deposit_required: number | null
          edge_profile: string | null
          email: string | null
          estimate_number: string
          expiration_date: string | null
          finish: string | null
          id: string
          labor_cost: number | null
          material: string | null
          material_cost: number | null
          measurements_sqft: number | null
          notes: string | null
          order_id: string
          phone: string | null
          project_address: string | null
          scope_of_work: string | null
          status: string
          subtotal: number | null
          tax: number | null
          terms_conditions: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          addons_cost?: number | null
          billing_address?: string | null
          color?: string | null
          created_at?: string
          customer_name?: string
          date?: string
          deposit_required?: number | null
          edge_profile?: string | null
          email?: string | null
          estimate_number?: string
          expiration_date?: string | null
          finish?: string | null
          id?: string
          labor_cost?: number | null
          material?: string | null
          material_cost?: number | null
          measurements_sqft?: number | null
          notes?: string | null
          order_id: string
          phone?: string | null
          project_address?: string | null
          scope_of_work?: string | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          terms_conditions?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          addons_cost?: number | null
          billing_address?: string | null
          color?: string | null
          created_at?: string
          customer_name?: string
          date?: string
          deposit_required?: number | null
          edge_profile?: string | null
          email?: string | null
          estimate_number?: string
          expiration_date?: string | null
          finish?: string | null
          id?: string
          labor_cost?: number | null
          material?: string | null
          material_cost?: number | null
          measurements_sqft?: number | null
          notes?: string | null
          order_id?: string
          phone?: string | null
          project_address?: string | null
          scope_of_work?: string | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          terms_conditions?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_ai_analyses: {
        Row: {
          analysis_type: string
          appointment_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          model_used: string | null
          result_json: Json
        }
        Insert: {
          analysis_type?: string
          appointment_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          model_used?: string | null
          result_json?: Json
        }
        Update: {
          analysis_type?: string
          appointment_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          model_used?: string | null
          result_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_ai_analyses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_ai_analyses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string
          preferred_contact_method: string | null
          project_type: string
          quote_id: string | null
          status: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          city: string
          company_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          preferred_contact_method?: string | null
          project_type: string
          quote_id?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          preferred_contact_method?: string | null
          project_type?: string
          quote_id?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          gallery_image_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          show_on_home: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          gallery_image_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          show_on_home?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          gallery_image_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          show_on_home?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          sent_at: string
          status: string
          subject: string
          type: string
          user_id: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          sent_at?: string
          status?: string
          subject: string
          type: string
          user_id?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
          type?: string
          user_id?: string | null
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
      payment_orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          deposit_amount: number | null
          due_date: string | null
          estimate_id: string | null
          estimate_total: number | null
          id: string
          internal_notes: string | null
          order_id: string
          payment_link: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_order_number: string
          remaining_balance: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          deposit_amount?: number | null
          due_date?: string | null
          estimate_id?: string | null
          estimate_total?: number | null
          id?: string
          internal_notes?: string | null
          order_id: string
          payment_link?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_order_number?: string
          remaining_balance?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          deposit_amount?: number | null
          due_date?: string | null
          estimate_id?: string | null
          estimate_total?: number | null
          id?: string
          internal_notes?: string | null
          order_id?: string
          payment_link?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_order_number?: string
          remaining_balance?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          order_id: string
          payment_date: string
          payment_method: string | null
          payment_order_id: string | null
          status: string
          transaction_reference: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          payment_date?: string
          payment_method?: string | null
          payment_order_id?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_order_id?: string | null
          status?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
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
      receipts: {
        Row: {
          amount: number
          company_info: string | null
          created_at: string
          date: string
          description: string | null
          estimate_id: string | null
          id: string
          notes: string | null
          order_id: string
          payment_id: string | null
          payment_method: string | null
          payment_order_id: string | null
          receipt_number: string
          receipt_type: string
          received_from: string
          remaining_balance: number | null
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          company_info?: string | null
          created_at?: string
          date?: string
          description?: string | null
          estimate_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          payment_id?: string | null
          payment_method?: string | null
          payment_order_id?: string | null
          receipt_number?: string
          receipt_type?: string
          received_from?: string
          remaining_balance?: number | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_info?: string | null
          created_at?: string
          date?: string
          description?: string | null
          estimate_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_order_id?: string | null
          receipt_number?: string
          receipt_type?: string
          received_from?: string
          remaining_balance?: number | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
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
      service_items: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          cost_value: number
          created_at: string
          id: string
          is_active: boolean
          max_value: number | null
          min_value: number | null
          name: string
          notes: string | null
          pricing_unit: Database["public"]["Enums"]["pricing_unit"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          cost_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          name: string
          notes?: string | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          cost_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number | null
          name?: string
          notes?: string | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"]
          updated_at?: string
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
      slab_services: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          override_cost: number | null
          override_multiplier: number | null
          service_id: string
          slab_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          override_cost?: number | null
          override_multiplier?: number | null
          service_id: string
          slab_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          override_cost?: number | null
          override_multiplier?: number | null
          service_id?: string
          slab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slab_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slab_services_slab_id_fkey"
            columns: ["slab_id"]
            isOneToOne: false
            referencedRelation: "slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      slabs: {
        Row: {
          best_option_notes: string | null
          best_option_preset: string | null
          created_at: string
          description: string
          id: string
          image_urls: string[] | null
          length_inches: number
          lot_number: string | null
          material_id: string
          name: string
          notes: string | null
          overage_pct_override: number | null
          purchase_value: number | null
          sales_value: number | null
          status: Database["public"]["Enums"]["slab_status"]
          thickness: string
          updated_at: string
          usable_sqft_override: number | null
          width_inches: number
        }
        Insert: {
          best_option_notes?: string | null
          best_option_preset?: string | null
          created_at?: string
          description?: string
          id?: string
          image_urls?: string[] | null
          length_inches: number
          lot_number?: string | null
          material_id: string
          name?: string
          notes?: string | null
          overage_pct_override?: number | null
          purchase_value?: number | null
          sales_value?: number | null
          status?: Database["public"]["Enums"]["slab_status"]
          thickness?: string
          updated_at?: string
          usable_sqft_override?: number | null
          width_inches: number
        }
        Update: {
          best_option_notes?: string | null
          best_option_preset?: string | null
          created_at?: string
          description?: string
          id?: string
          image_urls?: string[] | null
          length_inches?: number
          lot_number?: string | null
          material_id?: string
          name?: string
          notes?: string | null
          overage_pct_override?: number | null
          purchase_value?: number | null
          sales_value?: number | null
          status?: Database["public"]["Enums"]["slab_status"]
          thickness?: string
          updated_at?: string
          usable_sqft_override?: number | null
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
      stripe_payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          order_id: string
          payment_type: string
          refund_amount: number | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          order_id: string
          payment_type?: string
          refund_amount?: number | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          order_id?: string
          payment_type?: string
          refund_amount?: number | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      v_dashboard_kpis: {
        Row: {
          avg_project_value: number | null
          completed_orders: number | null
          total_deposits_collected: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      v_funnel_metrics: {
        Row: {
          calculated_quotes: number | null
          completed_orders: number | null
          converted_reservations: number | null
          total_orders: number | null
          total_quotes: number | null
          total_reservations: number | null
          unique_customers_quoted: number | null
        }
        Relationships: []
      }
      v_icp_signals: {
        Row: {
          active_zip_codes: number | null
          avg_lifetime_value: number | null
          avg_orders_per_customer: number | null
          customers_with_orders: number | null
          total_customers: number | null
        }
        Relationships: []
      }
      v_margin_estimation: {
        Row: {
          category: string | null
          customer_rate: number | null
          estimated_margin_pct: number | null
          internal_cost_per_sqft: number | null
          labor_rate_per_sqft: number | null
          material_name: string | null
          order_count: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      v_pricing_validation: {
        Row: {
          avg_quote_total: number | null
          avg_sqft_quoted: number | null
          category: string | null
          cutout_cost: number | null
          edge_profile_cost: number | null
          labor_rate_per_sqft: number | null
          material_name: string | null
          max_range: number | null
          min_range: number | null
          price_per_sqft: number | null
          quote_count: number | null
        }
        Relationships: []
      }
      v_reservation_patterns: {
        Row: {
          active_reservations: number | null
          avg_deposit: number | null
          avg_hold_hours: number | null
          cancelled_reservations: number | null
          converted_reservations: number | null
          expired_reservations: number | null
          total_reservations: number | null
        }
        Relationships: []
      }
      v_revenue_by_material: {
        Row: {
          avg_order_value: number | null
          category: string | null
          material_name: string | null
          order_count: number | null
          total_revenue: number | null
          unique_customers: number | null
        }
        Relationships: []
      }
      v_revenue_trend: {
        Row: {
          deposits: number | null
          month: string | null
          order_count: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_scheduling_patterns: {
        Row: {
          cancelled: number | null
          completed: number | null
          confirmed: number | null
          requested: number | null
          total_appointments: number | null
          unique_zip_codes: number | null
        }
        Relationships: []
      }
      v_sla_summary: {
        Row: {
          acknowledged_alerts: number | null
          breach_type: string | null
          earliest_breach: string | null
          latest_breach: string | null
          total_alerts: number | null
          unacknowledged_alerts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      expire_overdue_reservations: {
        Args: never
        Returns: {
          expired_count: number
          slabs_released: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "sales"
      appointment_status: "requested" | "confirmed" | "completed" | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      pricing_unit:
        | "fixed"
        | "per_sqft"
        | "per_linear_ft"
        | "per_cutout"
        | "per_project"
      quote_status: "pending" | "calculated" | "expired"
      reservation_status: "active" | "expired" | "cancelled" | "converted"
      service_category:
        | "labor"
        | "edge_profile"
        | "cutout"
        | "fabrication"
        | "addon"
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
      app_role: ["admin", "customer", "sales"],
      appointment_status: ["requested", "confirmed", "completed", "cancelled"],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      pricing_unit: [
        "fixed",
        "per_sqft",
        "per_linear_ft",
        "per_cutout",
        "per_project",
      ],
      quote_status: ["pending", "calculated", "expired"],
      reservation_status: ["active", "expired", "cancelled", "converted"],
      service_category: [
        "labor",
        "edge_profile",
        "cutout",
        "fabrication",
        "addon",
      ],
      slab_status: ["available", "reserved", "sold", "archived"],
    },
  },
} as const
