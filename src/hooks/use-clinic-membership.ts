"use client";

import { useQuery } from "@tanstack/react-query";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
type ClinicMember = Database["public"]["Tables"]["clinic_members"]["Row"];

export type ClinicMembership = ClinicMember & { clinic: Clinic };

const fetchMembership = async (userId: string) => {
  const { data, error } = await supabaseClient
    .from("clinic_members")
    .select("*, clinic:clinics(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ClinicMembership | null;
};

export const useClinicMembership = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clinic-membership", user?.id],
    queryFn: () => fetchMembership(user!.id),
    enabled: !!user?.id,
  });
};
