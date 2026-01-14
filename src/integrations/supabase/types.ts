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
      activity_log: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          event_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_readings: {
        Row: {
          bill_amount: number
          created_at: string | null
          current_reading: number
          id: string
          month: number
          previous_reading: number
          rate_per_unit: number
          reading_date: string | null
          tenant_id: string
          units_consumed: number
          year: number
        }
        Insert: {
          bill_amount: number
          created_at?: string | null
          current_reading: number
          id?: string
          month: number
          previous_reading: number
          rate_per_unit: number
          reading_date?: string | null
          tenant_id: string
          units_consumed: number
          year: number
        }
        Update: {
          bill_amount?: number
          created_at?: string | null
          current_reading?: number
          id?: string
          month?: number
          previous_reading?: number
          rate_per_unit?: number
          reading_date?: string | null
          tenant_id?: string
          units_consumed?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "electricity_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_rent_entries: {
        Row: {
          created_at: string | null
          id: string
          month: number
          rent_amount: number
          tenant_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          rent_amount: number
          tenant_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          rent_amount?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_rent_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          payment_mode: string
          payment_reason: string
          reason_notes: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_mode: string
          payment_reason?: string
          reason_notes?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_mode?: string
          payment_reason?: string
          reason_notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_landlord: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_landlord?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_landlord?: boolean | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          aadhaar_back_image_url: string | null
          aadhaar_image_url: string | null
          created_at: string | null
          current_meter_reading: number
          discontinued_at: string | null
          discontinued_reason: string | null
          electricity_rate: number
          extra_balance: number
          gender: string | null
          id: string
          initial_meter_reading: number
          is_active: boolean | null
          joining_date: string
          landlord_id: string
          members: Json | null
          monthly_rent: number
          name: string
          occupation: string | null
          pending_amount: number
          phone: string
          room_number: string
          total_paid: number
          updated_at: string | null
        }
        Insert: {
          aadhaar_back_image_url?: string | null
          aadhaar_image_url?: string | null
          created_at?: string | null
          current_meter_reading?: number
          discontinued_at?: string | null
          discontinued_reason?: string | null
          electricity_rate?: number
          extra_balance?: number
          gender?: string | null
          id?: string
          initial_meter_reading?: number
          is_active?: boolean | null
          joining_date?: string
          landlord_id: string
          members?: Json | null
          monthly_rent?: number
          name: string
          occupation?: string | null
          pending_amount?: number
          phone: string
          room_number: string
          total_paid?: number
          updated_at?: string | null
        }
        Update: {
          aadhaar_back_image_url?: string | null
          aadhaar_image_url?: string | null
          created_at?: string | null
          current_meter_reading?: number
          discontinued_at?: string | null
          discontinued_reason?: string | null
          electricity_rate?: number
          extra_balance?: number
          gender?: string | null
          id?: string
          initial_meter_reading?: number
          is_active?: boolean | null
          joining_date?: string
          landlord_id?: string
          members?: Json | null
          monthly_rent?: number
          name?: string
          occupation?: string | null
          pending_amount?: number
          phone?: string
          room_number?: string
          total_paid?: number
          updated_at?: string | null
        }
        Relationships: []
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
