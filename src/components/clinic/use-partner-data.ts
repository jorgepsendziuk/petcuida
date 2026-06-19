import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type PartnerAppointment = Database["public"]["Tables"]["clinic_appointments"]["Row"] & {
  pets: { name: string } | null;
  clinics: { name: string } | null;
};

export type GrantedPetRow = {
  grant_id: string;
  pet_id: string;
  pet_name: string;
  species: string;
  expires_at: string | null;
};

export type PartnerAuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

export type PartnerData = {
  pendingRequests: number;
  activeGrants: number;
  pendingDrafts: number;
  todayAppointments: PartnerAppointment[];
  upcomingAppointments: PartnerAppointment[];
  grantedPets: GrantedPetRow[];
  recentAudit: PartnerAuditRow[];
};

const fetchPartnerData = async (clinicId: string): Promise<PartnerData> => {
  const todayStart = dayjs().startOf("day").toISOString();
  const todayEnd = dayjs().endOf("day").toISOString();
  const weekEnd = dayjs().add(14, "day").endOf("day").toISOString();

  const [requestsRes, grantsRes, pendingRes, todayRes, upcomingRes, petsRes, auditRes] =
    await Promise.all([
      supabaseClient
        .from("pet_access_requests")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "pending"),
      supabaseClient
        .from("pet_access_grants")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .is("revoked_at", null),
      supabaseClient
        .from("pet_pending_changes")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "pending"),
      supabaseClient
        .from("clinic_appointments")
        .select("*, pets(name), clinics(name)")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", todayStart)
        .lte("scheduled_at", todayEnd)
        .eq("status", "scheduled")
        .order("scheduled_at"),
      supabaseClient
        .from("clinic_appointments")
        .select("*, pets(name), clinics(name)")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", dayjs().toISOString())
        .lte("scheduled_at", weekEnd)
        .in("status", ["scheduled"])
        .order("scheduled_at")
        .limit(12),
      supabaseClient
        .from("pet_access_grants")
        .select("id, pet_id, expires_at, pets(name, species)")
        .eq("clinic_id", clinicId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(6),
      supabaseClient
        .from("audit_log")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (requestsRes.error) throw requestsRes.error;
  if (grantsRes.error) throw grantsRes.error;
  if (pendingRes.error) throw pendingRes.error;
  if (todayRes.error) throw todayRes.error;
  if (upcomingRes.error) throw upcomingRes.error;
  if (petsRes.error) throw petsRes.error;
  if (auditRes.error) throw auditRes.error;

  type GrantRow = {
    id: string;
    pet_id: string;
    expires_at: string | null;
    pets: { name: string; species: string } | null;
  };

  return {
    pendingRequests: requestsRes.count ?? 0,
    activeGrants: grantsRes.count ?? 0,
    pendingDrafts: pendingRes.count ?? 0,
    todayAppointments: (todayRes.data ?? []) as PartnerAppointment[],
    upcomingAppointments: (upcomingRes.data ?? []) as PartnerAppointment[],
    grantedPets: ((petsRes.data ?? []) as GrantRow[]).map((row) => ({
      grant_id: row.id,
      pet_id: row.pet_id,
      pet_name: row.pets?.name ?? "—",
      species: row.pets?.species ?? "—",
      expires_at: row.expires_at,
    })),
    recentAudit: (auditRes.data ?? []) as PartnerAuditRow[],
  };
};

export const usePartnerData = (clinicId: string | undefined) =>
  useQuery({
    queryKey: ["partner-hub", clinicId],
    queryFn: () => fetchPartnerData(clinicId!),
    enabled: !!clinicId,
  });

export const fetchTutorAppointments = async (tutorId: string) => {
  const { data, error } = await supabaseClient
    .from("clinic_appointments")
    .select("*, pets(name), clinics(name)")
    .eq("tutor_id", tutorId)
    .gte("scheduled_at", dayjs().startOf("day").toISOString())
    .lte("scheduled_at", dayjs().add(30, "day").endOf("day").toISOString())
    .in("status", ["scheduled", "completed"])
    .order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as PartnerAppointment[];
};
