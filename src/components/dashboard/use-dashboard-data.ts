import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";

import { fetchTutorAppointments, type PartnerAppointment } from "@/components/clinic/use-partner-data";
import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type CareStatusRow = Database["public"]["Tables"]["vw_pet_care_status"]["Row"];
type Reminder = Database["public"]["Tables"]["reminders"]["Row"] & {
  pets: { name: string } | null;
  pet_treatments: { title: string } | null;
};
type AccessRequest = Database["public"]["Tables"]["pet_access_requests"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};
type PendingChange = Database["public"]["Tables"]["pet_pending_changes"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};
type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

export type DashboardData = {
  careFeed: CareStatusRow[];
  reminders: Reminder[];
  accessRequests: AccessRequest[];
  pendingChanges: PendingChange[];
  clinics: Clinic[];
  clinicAppointments: PartnerAppointment[];
};

const fetchDashboardData = async (userId: string): Promise<DashboardData> => {
  const { data: pets } = await supabaseClient
    .from("pets")
    .select("id")
    .eq("owner_id", userId)
    .returns<{ id: string }[]>();

  const petIds = (pets ?? []).map((p) => p.id);

  const [careRes, remindersRes, requestsRes, pendingRes, clinicsRes, appointmentsRes] = await Promise.all([
    petIds.length > 0
      ? supabaseClient
          .from("vw_pet_care_status")
          .select("*")
          .in("pet_id", petIds)
          .order("next_event_at", { ascending: true })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
    supabaseClient
      .from("reminders")
      .select("*, pets(name), pet_treatments(title)")
      .gte("remind_at", dayjs().startOf("day").toISOString())
      .lte("remind_at", dayjs().add(30, "day").endOf("day").toISOString())
      .order("remind_at", { ascending: true }),
    supabaseClient
      .from("pet_access_requests")
      .select("*, clinic:clinics(name), pets(name)")
      .eq("tutor_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("pet_pending_changes")
      .select("*, clinic:clinics(name), pets(name)")
      .eq("tutor_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabaseClient.from("clinics").select("*").eq("is_public", true).order("name"),
    fetchTutorAppointments(userId),
  ]);

  return {
    careFeed: (careRes.data ?? []) as CareStatusRow[],
    reminders: (remindersRes.data ?? []) as Reminder[],
    accessRequests: (requestsRes.data ?? []) as AccessRequest[],
    pendingChanges: (pendingRes.data ?? []) as PendingChange[],
    clinics: (clinicsRes.data ?? []) as Clinic[],
    clinicAppointments: appointmentsRes,
  };
};

export const useDashboardData = (userId: string | undefined) =>
  useQuery({
    queryKey: ["dashboard-hub", userId],
    queryFn: () => fetchDashboardData(userId!),
    enabled: !!userId,
  });
