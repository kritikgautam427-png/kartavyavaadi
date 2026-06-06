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
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          body: string
          committee_id: string | null
          created_at: string
          id: string
          scope: string
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          committee_id?: string | null
          created_at?: string
          id?: string
          scope?: string
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          committee_id?: string | null
          created_at?: string
          id?: string
          scope?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      chit_scores: {
        Row: {
          ai_breakdown: Json | null
          ai_justification: string | null
          ai_recommended_score: number | null
          ai_strengths: string | null
          ai_weaknesses: string | null
          chit_id: string
          committee_id: string
          created_at: string
          delegate_user_id: string
          final_breakdown: Json | null
          final_score: number | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          override_reason: string | null
        }
        Insert: {
          ai_breakdown?: Json | null
          ai_justification?: string | null
          ai_recommended_score?: number | null
          ai_strengths?: string | null
          ai_weaknesses?: string | null
          chit_id: string
          committee_id: string
          created_at?: string
          delegate_user_id: string
          final_breakdown?: Json | null
          final_score?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          override_reason?: string | null
        }
        Update: {
          ai_breakdown?: Json | null
          ai_justification?: string | null
          ai_recommended_score?: number | null
          ai_strengths?: string | null
          ai_weaknesses?: string | null
          chit_id?: string
          committee_id?: string
          created_at?: string
          delegate_user_id?: string
          final_breakdown?: Json | null
          final_score?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          override_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chit_scores_chit_id_fkey"
            columns: ["chit_id"]
            isOneToOne: true
            referencedRelation: "chits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chit_scores_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      chits: {
        Row: {
          body: string
          chit_type: Database["public"]["Enums"]["chit_type"]
          committee_id: string
          created_at: string
          id: string
          sender_portfolio_id: string
          sender_user_id: string
          status: Database["public"]["Enums"]["chit_status"]
          target_kind: Database["public"]["Enums"]["chit_target"]
          target_portfolio_id: string | null
        }
        Insert: {
          body: string
          chit_type: Database["public"]["Enums"]["chit_type"]
          committee_id: string
          created_at?: string
          id?: string
          sender_portfolio_id: string
          sender_user_id: string
          status?: Database["public"]["Enums"]["chit_status"]
          target_kind: Database["public"]["Enums"]["chit_target"]
          target_portfolio_id?: string | null
        }
        Update: {
          body?: string
          chit_type?: Database["public"]["Enums"]["chit_type"]
          committee_id?: string
          created_at?: string
          id?: string
          sender_portfolio_id?: string
          sender_user_id?: string
          status?: Database["public"]["Enums"]["chit_status"]
          target_kind?: Database["public"]["Enums"]["chit_target"]
          target_portfolio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chits_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chits_sender_portfolio_id_fkey"
            columns: ["sender_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chits_target_portfolio_id_fkey"
            columns: ["target_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_eb: {
        Row: {
          committee_id: string
          id: string
          role_title: string | null
          user_id: string
        }
        Insert: {
          committee_id: string
          id?: string
          role_title?: string | null
          user_id: string
        }
        Update: {
          committee_id?: string
          id?: string
          role_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_eb_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          agenda: string | null
          conference_id: string
          created_at: string
          description: string | null
          fee_inr: number | null
          id: string
          join_code: string | null
          mode: string
          name: string
          short_name: string | null
        }
        Insert: {
          agenda?: string | null
          conference_id: string
          created_at?: string
          description?: string | null
          fee_inr?: number | null
          id?: string
          join_code?: string | null
          mode?: string
          name: string
          short_name?: string | null
        }
        Update: {
          agenda?: string | null
          conference_id?: string
          created_at?: string
          description?: string | null
          fee_inr?: number | null
          id?: string
          join_code?: string | null
          mode?: string
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committees_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      conferences: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          edition: string | null
          event_date: string | null
          id: string
          name: string
          venue: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          edition?: string | null
          event_date?: string | null
          id?: string
          name: string
          venue?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          edition?: string | null
          event_date?: string | null
          id?: string
          name?: string
          venue?: string | null
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          committee_id: string
          created_at: string
          delegate_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          committee_id: string
          created_at?: string
          delegate_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          committee_id?: string
          created_at?: string
          delegate_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          committee_id: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          url: string
        }
        Insert: {
          category?: string
          committee_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          url: string
        }
        Update: {
          category?: string
          committee_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      score_audit: {
        Row: {
          ai_recommended: number | null
          chit_id: string
          committee_id: string
          created_at: string
          evaluator: string | null
          final_score: number | null
          id: string
          override_reason: string | null
        }
        Insert: {
          ai_recommended?: number | null
          chit_id: string
          committee_id: string
          created_at?: string
          evaluator?: string | null
          final_score?: number | null
          id?: string
          override_reason?: string | null
        }
        Update: {
          ai_recommended?: number | null
          chit_id?: string
          committee_id?: string
          created_at?: string
          evaluator?: string | null
          final_score?: number | null
          id?: string
          override_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_audit_chit_id_fkey"
            columns: ["chit_id"]
            isOneToOne: false
            referencedRelation: "chits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_audit_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      score_visibility: {
        Row: {
          committee_id: string
          mode: Database["public"]["Enums"]["visibility_mode"]
          reveal_at: string | null
          updated_at: string
        }
        Insert: {
          committee_id: string
          mode?: Database["public"]["Enums"]["visibility_mode"]
          reveal_at?: string | null
          updated_at?: string
        }
        Update: {
          committee_id?: string
          mode?: Database["public"]["Enums"]["visibility_mode"]
          reveal_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_visibility_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: true
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_criteria: {
        Row: {
          committee_id: string
          enabled: boolean
          id: string
          name: string
          sort_order: number
          weight: number
        }
        Insert: {
          committee_id: string
          enabled?: boolean
          id?: string
          name: string
          sort_order?: number
          weight?: number
        }
        Update: {
          committee_id?: string
          enabled?: boolean
          id?: string
          name?: string
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scoring_criteria_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          category: string
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
      is_eb_of_committee: {
        Args: { _committee_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "executive_board" | "delegate"
      chit_status: "SUBMITTED" | "AI_SCORED" | "FINALIZED" | "REJECTED"
      chit_target: "EXECUTIVE_BOARD" | "PORTFOLIO"
      chit_type: "POI" | "POO" | "POE" | "POP" | "SUBSTANTIVE" | "REPLY"
      visibility_mode:
        | "HIDDEN"
        | "TOTAL_ONLY"
        | "BREAKDOWN"
        | "REVEAL_AFTER_END"
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
      app_role: ["super_admin", "executive_board", "delegate"],
      chit_status: ["SUBMITTED", "AI_SCORED", "FINALIZED", "REJECTED"],
      chit_target: ["EXECUTIVE_BOARD", "PORTFOLIO"],
      chit_type: ["POI", "POO", "POE", "POP", "SUBSTANTIVE", "REPLY"],
      visibility_mode: [
        "HIDDEN",
        "TOTAL_ONLY",
        "BREAKDOWN",
        "REVEAL_AFTER_END",
      ],
    },
  },
} as const
