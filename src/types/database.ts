export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          cpf: string | null;
          cpf_share_enabled: boolean;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          cpf?: string | null;
          cpf_share_enabled?: boolean;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          cpf?: string | null;
          cpf_share_enabled?: boolean;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      clinics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          phone: string | null;
          email: string | null;
          address_line: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          address_line?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          address_line?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      clinic_members: {
        Row: {
          id: string;
          clinic_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["clinic_member_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["clinic_member_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["clinic_member_role"];
          created_at?: string;
        };
      };
      pet_access_requests: {
        Row: {
          id: string;
          clinic_id: string;
          pet_id: string;
          tutor_id: string;
          requested_by: string;
          status: Database["public"]["Enums"]["pet_access_request_status"];
          message: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          pet_id: string;
          tutor_id: string;
          requested_by: string;
          status?: Database["public"]["Enums"]["pet_access_request_status"];
          message?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          pet_id?: string;
          tutor_id?: string;
          requested_by?: string;
          status?: Database["public"]["Enums"]["pet_access_request_status"];
          message?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pet_access_grants: {
        Row: {
          id: string;
          clinic_id: string;
          pet_id: string;
          tutor_id: string;
          granted_by: string;
          request_id: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          pet_id: string;
          tutor_id: string;
          granted_by: string;
          request_id?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          pet_id?: string;
          tutor_id?: string;
          granted_by?: string;
          request_id?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
      };
      pet_pending_changes: {
        Row: {
          id: string;
          clinic_id: string;
          pet_id: string | null;
          tutor_id: string | null;
          created_by: string;
          change_type: string;
          payload: Json;
          status: Database["public"]["Enums"]["pet_pending_change_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          pet_id?: string | null;
          tutor_id?: string | null;
          created_by: string;
          change_type: string;
          payload?: Json;
          status?: Database["public"]["Enums"]["pet_pending_change_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          pet_id?: string | null;
          tutor_id?: string | null;
          created_by?: string;
          change_type?: string;
          payload?: Json;
          status?: Database["public"]["Enums"]["pet_pending_change_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          clinic_id: string | null;
          pet_id: string | null;
          action: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          clinic_id?: string | null;
          pet_id?: string | null;
          action: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          clinic_id?: string | null;
          pet_id?: string | null;
          action?: string;
          details?: Json;
          created_at?: string;
        };
      };
      pets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          species: "dog" | "cat" | "bird" | "small_pet" | "other";
          breed: string | null;
          sex: "female" | "male" | "unknown";
          birthdate: string | null;
          birthdate_estimated: boolean;
          weight_kg: number | null;
          color: string | null;
          microchip_id: string | null;
          notes: string | null;
          mother_id: string | null;
          father_id: string | null;
          photo_url: string | null;
          castrated: boolean;
          sibling_group_id: string | null;
          deceased: boolean;
          death_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          species?: Database["public"]["Enums"]["pet_species"];
          breed?: string | null;
          sex?: Database["public"]["Enums"]["pet_sex"];
          birthdate?: string | null;
          birthdate_estimated?: boolean;
          weight_kg?: number | null;
          color?: string | null;
          microchip_id?: string | null;
          notes?: string | null;
          mother_id?: string | null;
          father_id?: string | null;
          photo_url?: string | null;
          castrated?: boolean;
          sibling_group_id?: string | null;
          deceased?: boolean;
          death_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          species?: Database["public"]["Enums"]["pet_species"];
          breed?: string | null;
          sex?: Database["public"]["Enums"]["pet_sex"];
          birthdate?: string | null;
          birthdate_estimated?: boolean;
          weight_kg?: number | null;
          color?: string | null;
          microchip_id?: string | null;
          notes?: string | null;
          mother_id?: string | null;
          father_id?: string | null;
          photo_url?: string | null;
          castrated?: boolean;
          sibling_group_id?: string | null;
          deceased?: boolean;
          death_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pet_photos: {
        Row: {
          id: string;
          pet_id: string;
          storage_path: string;
          description: string | null;
          captured_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          storage_path: string;
          description?: string | null;
          captured_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          storage_path?: string;
          description?: string | null;
          captured_at?: string | null;
          created_at?: string;
        };
      };
      treatment_templates: {
        Row: {
          id: string;
          owner_id: string | null;
          title: string;
          kind: Database["public"]["Enums"]["treatment_kind"];
          description: string | null;
          manufacturer: string | null;
          dosage: string | null;
          route: string | null;
          recommended_frequency_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          title: string;
          kind: Database["public"]["Enums"]["treatment_kind"];
          description?: string | null;
          manufacturer?: string | null;
          dosage?: string | null;
          route?: string | null;
          recommended_frequency_days?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          title?: string;
          kind?: Database["public"]["Enums"]["treatment_kind"];
          description?: string | null;
          manufacturer?: string | null;
          dosage?: string | null;
          route?: string | null;
          recommended_frequency_days?: number | null;
          created_at?: string;
        };
      };
      pet_treatments: {
        Row: {
          id: string;
          pet_id: string;
          template_id: string | null;
          kind: Database["public"]["Enums"]["treatment_kind"];
          title: string;
          description: string | null;
          status: Database["public"]["Enums"]["treatment_status"];
          start_date: string | null;
          due_date: string | null;
          frequency_days: number | null;
          last_administered_at: string | null;
          next_due_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          template_id?: string | null;
          kind: Database["public"]["Enums"]["treatment_kind"];
          title: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["treatment_status"];
          start_date?: string | null;
          due_date?: string | null;
          frequency_days?: number | null;
          last_administered_at?: string | null;
          next_due_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          template_id?: string | null;
          kind?: Database["public"]["Enums"]["treatment_kind"];
          title?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["treatment_status"];
          start_date?: string | null;
          due_date?: string | null;
          frequency_days?: number | null;
          last_administered_at?: string | null;
          next_due_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pet_treatment_logs: {
        Row: {
          id: string;
          pet_treatment_id: string;
          administered_at: string;
          status: Database["public"]["Enums"]["treatment_status"];
          dosage: string | null;
          batch_number: string | null;
          administered_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_treatment_id: string;
          administered_at: string;
          status?: Database["public"]["Enums"]["treatment_status"];
          dosage?: string | null;
          batch_number?: string | null;
          administered_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_treatment_id?: string;
          administered_at?: string;
          status?: Database["public"]["Enums"]["treatment_status"];
          dosage?: string | null;
          batch_number?: string | null;
          administered_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      pet_prescriptions: {
        Row: {
          id: string;
          pet_id: string;
          owner_id: string;
          prescription_date: string;
          veterinarian_name: string | null;
          veterinarian_crmv: string | null;
          clinic_name: string | null;
          image_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          owner_id: string;
          prescription_date?: string;
          veterinarian_name?: string | null;
          veterinarian_crmv?: string | null;
          clinic_name?: string | null;
          image_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          owner_id?: string;
          prescription_date?: string;
          veterinarian_name?: string | null;
          veterinarian_crmv?: string | null;
          clinic_name?: string | null;
          image_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      prescription_medications: {
        Row: {
          id: string;
          prescription_id: string;
          medication_name: string;
          dosage: string | null;
          frequency: string | null;
          duration_days: number | null;
          start_date: string | null;
          end_date: string | null;
          route: string | null;
          instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          medication_name: string;
          dosage?: string | null;
          frequency?: string | null;
          duration_days?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          route?: string | null;
          instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prescription_id?: string;
          medication_name?: string;
          dosage?: string | null;
          frequency?: string | null;
          duration_days?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          route?: string | null;
          instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          pet_id: string;
          pet_treatment_id: string | null;
          remind_at: string;
          delivered_at: string | null;
          channel: string[] | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          pet_treatment_id?: string | null;
          remind_at: string;
          delivered_at?: string | null;
          channel?: string[] | null;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          pet_treatment_id?: string | null;
          remind_at?: string;
          delivered_at?: string | null;
          channel?: string[] | null;
          message?: string;
          created_at?: string;
        };
      };
      clinic_appointments: {
        Row: {
          id: string;
          clinic_id: string;
          pet_id: string;
          tutor_id: string;
          scheduled_at: string;
          duration_minutes: number;
          status: Database["public"]["Enums"]["clinic_appointment_status"];
          reason: string | null;
          visit_notes: string | null;
          return_remind_at: string | null;
          pet_treatment_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          pet_id: string;
          tutor_id: string;
          scheduled_at: string;
          duration_minutes?: number;
          status?: Database["public"]["Enums"]["clinic_appointment_status"];
          reason?: string | null;
          visit_notes?: string | null;
          return_remind_at?: string | null;
          pet_treatment_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          pet_id?: string;
          tutor_id?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          status?: Database["public"]["Enums"]["clinic_appointment_status"];
          reason?: string | null;
          visit_notes?: string | null;
          return_remind_at?: string | null;
          pet_treatment_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      vw_pet_care_status: {
        Row: {
          pet_id: string;
          owner_id: string;
          name: string;
          title: string | null;
          kind: string | null;
          remind_at: string | null;
          next_due_at: string | null;
          status: Database["public"]["Enums"]["treatment_status"] | null;
          frequency_days: number | null;
          next_event_at: string | null;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      vw_pet_care_status: {
        Row: Database["public"]["Tables"]["vw_pet_care_status"]["Row"];
      };
    };
    Functions: {
      log_pet_treatment: {
        Args: {
          p_pet_treatment_id: string;
          p_administered_at?: string | null;
          p_status?: Database["public"]["Enums"]["treatment_status"] | null;
          p_dosage?: string | null;
          p_batch_number?: string | null;
          p_administered_by?: string | null;
          p_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["pet_treatment_logs"]["Row"];
      };
      find_tutor_by_cpf: {
        Args: { p_cpf: string };
        Returns: {
          tutor_id: string;
          full_name: string | null;
          pet_id: string;
          pet_name: string;
          pet_species: Database["public"]["Enums"]["pet_species"];
        }[];
      };
      find_profile_by_email: {
        Args: { p_email: string };
        Returns: { user_id: string; full_name: string | null }[];
      };
    };
    Enums: {
      pet_species: "dog" | "cat" | "bird" | "small_pet" | "other";
      pet_sex: "female" | "male" | "unknown";
      treatment_kind: "vaccine" | "deworming" | "tick_flea" | "general_medication" | "checkup";
      treatment_status: "scheduled" | "completed" | "missed" | "cancelled";
      clinic_member_role: "owner" | "staff";
      pet_access_request_status: "pending" | "approved" | "rejected" | "cancelled";
      pet_pending_change_status: "pending" | "approved" | "rejected";
      clinic_appointment_status: "scheduled" | "completed" | "cancelled" | "no_show";
    };
  };
}

