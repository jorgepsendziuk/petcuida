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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
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
          created_at?: string;
          updated_at?: string;
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
    };
    Enums: {
      pet_species: "dog" | "cat" | "bird" | "small_pet" | "other";
      pet_sex: "female" | "male" | "unknown";
      treatment_kind: "vaccine" | "deworming" | "tick_flea" | "general_medication" | "checkup";
      treatment_status: "scheduled" | "completed" | "missed" | "cancelled";
    };
  };
}

