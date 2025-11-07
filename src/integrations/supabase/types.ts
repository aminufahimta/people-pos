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
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string | null
          date: string
          deduction_amount: number | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          date?: string
          deduction_amount?: number | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          date?: string
          deduction_amount?: number | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_audits: {
        Row: {
          audit_comments: string | null
          competency_rating: string | null
          created_at: string | null
          current_job_title: string
          declaration_date: string | null
          department: string | null
          education: Json | null
          employment_history: Json | null
          engagement_status: string | null
          file_record_status: string | null
          final_consultant_comments: string | null
          final_rating: string | null
          grade: string | null
          home_address: string | null
          home_telephone: string | null
          id: string
          job_description: string | null
          job_description_attached: boolean | null
          management_experience: string | null
          manages_staff: boolean | null
          name: string
          number_of_employees: number | null
          other_financial_benefit: string | null
          people_supervised: string | null
          performance_scores: string | null
          professional_membership: Json | null
          salary: number | null
          signature: string | null
          skills_competency: Json | null
          status: string | null
          submitted_at: string | null
          training: Json | null
          unpaid_roles: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audit_comments?: string | null
          competency_rating?: string | null
          created_at?: string | null
          current_job_title: string
          declaration_date?: string | null
          department?: string | null
          education?: Json | null
          employment_history?: Json | null
          engagement_status?: string | null
          file_record_status?: string | null
          final_consultant_comments?: string | null
          final_rating?: string | null
          grade?: string | null
          home_address?: string | null
          home_telephone?: string | null
          id?: string
          job_description?: string | null
          job_description_attached?: boolean | null
          management_experience?: string | null
          manages_staff?: boolean | null
          name: string
          number_of_employees?: number | null
          other_financial_benefit?: string | null
          people_supervised?: string | null
          performance_scores?: string | null
          professional_membership?: Json | null
          salary?: number | null
          signature?: string | null
          skills_competency?: Json | null
          status?: string | null
          submitted_at?: string | null
          training?: Json | null
          unpaid_roles?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audit_comments?: string | null
          competency_rating?: string | null
          created_at?: string | null
          current_job_title?: string
          declaration_date?: string | null
          department?: string | null
          education?: Json | null
          employment_history?: Json | null
          engagement_status?: string | null
          file_record_status?: string | null
          final_consultant_comments?: string | null
          final_rating?: string | null
          grade?: string | null
          home_address?: string | null
          home_telephone?: string | null
          id?: string
          job_description?: string | null
          job_description_attached?: boolean | null
          management_experience?: string | null
          manages_staff?: boolean | null
          name?: string
          number_of_employees?: number | null
          other_financial_benefit?: string | null
          people_supervised?: string | null
          performance_scores?: string | null
          professional_membership?: Json | null
          salary?: number | null
          signature?: string | null
          skills_competency?: Json | null
          status?: string | null
          submitted_at?: string | null
          training?: Json | null
          unpaid_roles?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          document_type: string
          file_name: string
          file_path: string
          id: string
          uploaded_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_path: string
          id?: string
          uploaded_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          item_name: string
          item_type: string
          last_restocked_at: string | null
          quantity: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_name: string
          item_type: string
          last_restocked_at?: string | null
          quantity?: number
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_name?: string
          item_type?: string
          last_restocked_at?: string | null
          quantity?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          email: string
          full_name: string
          hire_date: string | null
          id: string
          is_approved: boolean | null
          is_suspended: boolean | null
          is_terminated: boolean | null
          phone: string | null
          position: string | null
          strike_count: number | null
          suspension_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          email: string
          full_name: string
          hire_date?: string | null
          id: string
          is_approved?: boolean | null
          is_suspended?: boolean | null
          is_terminated?: boolean | null
          phone?: string | null
          position?: string | null
          strike_count?: number | null
          suspension_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_approved?: boolean | null
          is_suspended?: boolean | null
          is_terminated?: boolean | null
          phone?: string | null
          position?: string | null
          strike_count?: number | null
          suspension_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          project_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          project_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          project_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_info: {
        Row: {
          base_salary: number
          created_at: string | null
          currency: string | null
          current_salary: number
          daily_rate: number
          id: string
          total_deductions: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_salary?: number
          created_at?: string | null
          currency?: string | null
          current_salary?: number
          daily_rate?: number
          id?: string
          total_deductions?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_salary?: number
          created_at?: string | null
          currency?: string | null
          current_salary?: number
          daily_rate?: number
          id?: string
          total_deductions?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suspensions: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string
          id: string
          reason: string
          salary_deduction_percentage: number | null
          status: Database["public"]["Enums"]["suspension_status"]
          strike_number: number | null
          suspension_end: string
          suspension_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          reason: string
          salary_deduction_percentage?: number | null
          status?: Database["public"]["Enums"]["suspension_status"]
          strike_number?: number | null
          suspension_end: string
          suspension_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          reason?: string
          salary_deduction_percentage?: number | null
          status?: Database["public"]["Enums"]["suspension_status"]
          strike_number?: number | null
          suspension_end?: string
          suspension_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspensions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          anchors_used: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          due_date: string | null
          id: string
          installation_address: string | null
          inventory_deducted: boolean | null
          poe_adapters_used: number | null
          poles_used: number | null
          priority: string
          project_id: string | null
          routers_used: number | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          anchors_used?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          installation_address?: string | null
          inventory_deducted?: boolean | null
          poe_adapters_used?: number | null
          poles_used?: number | null
          priority?: string
          project_id?: string | null
          routers_used?: number | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          anchors_used?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          installation_address?: string | null
          inventory_deducted?: boolean | null
          poe_adapters_used?: number | null
          poles_used?: number | null
          priority?: string
          project_id?: string | null
          routers_used?: number | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
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
      check_suspension_expiry: { Args: never; Returns: undefined }
      get_super_admin_emails: {
        Args: never
        Returns: {
          email: string
          full_name: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_super_admins: {
        Args: { p_html: string; p_subject: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "hr_manager" | "employee" | "project_manager"
      suspension_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "completed"
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
      app_role: ["super_admin", "hr_manager", "employee", "project_manager"],
      suspension_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "completed",
      ],
    },
  },
} as const
