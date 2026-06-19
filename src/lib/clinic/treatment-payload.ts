import type { Database } from "@/types/database";

export type TreatmentKind = Database["public"]["Enums"]["treatment_kind"];
export type TreatmentStatus = Database["public"]["Enums"]["treatment_status"];

export type ClinicTreatmentPayload = {
  title: string;
  kind: TreatmentKind;
  status: TreatmentStatus;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  frequency_days?: number | null;
  notes?: string | null;
};

export const TREATMENT_KIND_LABELS: Record<TreatmentKind, string> = {
  vaccine: "Vacina",
  deworming: "Vermífugo",
  tick_flea: "Carrapato/Pulga",
  general_medication: "Medicação",
  checkup: "Check-up",
};

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  missed: "Perdido",
  cancelled: "Cancelado",
};

export const isClinicTreatmentPayload = (payload: unknown): payload is ClinicTreatmentPayload => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return typeof p.title === "string" && typeof p.kind === "string" && typeof p.status === "string";
};

export const formatTreatmentPayload = (payload: ClinicTreatmentPayload): string => {
  const parts = [
    payload.title,
    TREATMENT_KIND_LABELS[payload.kind],
    TREATMENT_STATUS_LABELS[payload.status],
  ];
  if (payload.due_date) parts.push(`próximo: ${payload.due_date}`);
  if (payload.notes) parts.push(payload.notes);
  return parts.filter(Boolean).join(" · ");
};
