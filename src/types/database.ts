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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          block: string | null
          class_id: string
          created_at: string
          date: string | null
          description: string | null
          id: string
          location: string | null
          updated_at: string | null
        }
        Insert: {
          block?: string | null
          class_id: string
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          location?: string | null
          updated_at?: string | null
        }
        Update: {
          block?: string | null
          class_id?: string
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          location?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_blocks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_blocks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_materials: {
        Row: {
          class_id: string
          created_at: string
          file_url: string
          id: string
          title: string
          type: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          file_url: string
          id?: string
          title: string
          type?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          file_url?: string
          id?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          age_max: number | null
          age_min: number | null
          block: string | null
          capacity: number
          created_at: string
          current_enrollment: number
          day: string | null
          day_of_week: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          location: string | null
          name: string
          price: number
          schedule_config: Json | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["ClassStatus"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          block?: string | null
          capacity?: number
          created_at?: string
          current_enrollment?: number
          day?: string | null
          day_of_week?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name: string
          price?: number
          schedule_config?: Json | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["ClassStatus"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          block?: string | null
          capacity?: number
          created_at?: string
          current_enrollment?: number
          day?: string | null
          day_of_week?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name?: string
          price?: number
          schedule_config?: Json | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["ClassStatus"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["EnrollmentStatus"]
          student_id: string
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          student_id: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          student_id?: string
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          dob: string | null
          email: string
          first_name: string
          grade: string | null
          id: string
          last_name: string
          parent_id: string
          relationship: string
          student_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          dob?: string | null
          email: string
          first_name: string
          grade?: string | null
          id?: string
          last_name: string
          parent_id: string
          relationship?: string
          student_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          dob?: string | null
          email?: string
          first_name?: string
          grade?: string | null
          id?: string
          last_name?: string
          parent_id?: string
          relationship?: string
          student_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          enrollment_id: string
          id: string
          metadata: Json | null
          paid_at: string | null
          provider: string | null
          status: Database["public"]["Enums"]["PaymentStatus"]
          stripe_payment_id: string | null
          stripe_payment_intent: string | null
          sync_status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          enrollment_id: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["PaymentStatus"]
          stripe_payment_id?: string | null
          stripe_payment_intent?: string | null
          sync_status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          enrollment_id?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["PaymentStatus"]
          stripe_payment_id?: string | null
          stripe_payment_intent?: string | null
          sync_status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          code_of_conduct_agreed_at: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_parent: boolean
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["UserRole"]
          specializations: string[] | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          code_of_conduct_agreed_at?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string
          id: string
          is_parent?: boolean
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          specializations?: string[] | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          code_of_conduct_agreed_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_parent?: boolean
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          specializations?: string[] | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_schedule_text: {
        Args: {
          p_recurrence_days: string[]
          p_recurrence_duration: number
          p_recurrence_pattern: string
          p_recurrence_time: string
        }
        Returns: string
      }
      get_next_waitlist_position: {
        Args: { p_class_id: string }
        Returns: number
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["UserRole"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_teacher_of_student: {
        Args: { check_student_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ClassStatus: "draft" | "published" | "completed" | "cancelled"
      EnrollmentStatus: "pending" | "confirmed" | "cancelled" | "waitlisted"
      PaymentStatus: "pending" | "completed" | "failed" | "refunded"
      UserRole:
        | "parent"
        | "teacher"
        | "student"
        | "admin"
        | "class_scheduler"
        | "super_admin"
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
      ClassStatus: ["draft", "published", "completed", "cancelled"],
      EnrollmentStatus: ["pending", "confirmed", "cancelled", "waitlisted"],
      PaymentStatus: ["pending", "completed", "failed", "refunded"],
      UserRole: [
        "parent",
        "teacher",
        "student",
        "admin",
        "class_scheduler",
        "super_admin",
      ],
    },
  },
} as const
