import { supabaseClient } from "@/lib/supabase/client";
import type { ClinicTreatmentPayload } from "@/lib/clinic/treatment-payload";

type AddTreatmentParams = {
  clinicId: string;
  petId: string;
  tutorId: string;
  userId: string;
  hasGrant: boolean;
  payload: ClinicTreatmentPayload;
};

export const addClinicTreatment = async ({
  clinicId,
  petId,
  tutorId,
  userId,
  hasGrant,
  payload,
}: AddTreatmentParams) => {
  if (hasGrant) {
    const { data, error } = await supabaseClient
      .from("pet_treatments")
      .insert({
        pet_id: petId,
        title: payload.title,
        kind: payload.kind,
        status: payload.status,
        description: payload.description ?? null,
        start_date: payload.start_date ?? null,
        due_date: payload.due_date ?? null,
        frequency_days: payload.frequency_days ?? null,
        notes: payload.notes ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw error;

    const treatmentId = (data as { id: string } | null)?.id;

    await supabaseClient.from("audit_log").insert({
      actor_id: userId,
      clinic_id: clinicId,
      pet_id: petId,
      action: "treatment_added",
      details: { treatment_id: treatmentId, ...payload },
    } as never);

    return { mode: "applied" as const, treatmentId };
  }

  const { error } = await supabaseClient.from("pet_pending_changes").insert({
    clinic_id: clinicId,
    pet_id: petId,
    tutor_id: tutorId,
    created_by: userId,
    change_type: "treatment",
    payload,
  } as never);

  if (error) throw error;

  await supabaseClient.from("audit_log").insert({
    actor_id: userId,
    clinic_id: clinicId,
    pet_id: petId,
    action: "treatment_draft_created",
    details: payload,
  } as never);

  return { mode: "pending" as const };
};

export const applyPendingTreatment = async ({
  pendingId,
  petId,
  tutorId,
  clinicId,
  payload,
  reviewerId,
}: {
  pendingId: string;
  petId: string;
  tutorId: string;
  clinicId: string;
  payload: ClinicTreatmentPayload;
  reviewerId: string;
}) => {
  const { data: treatment, error: insertError } = await supabaseClient
    .from("pet_treatments")
    .insert({
      pet_id: petId,
      title: payload.title,
      kind: payload.kind,
      status: payload.status,
      description: payload.description ?? null,
      start_date: payload.start_date ?? null,
      due_date: payload.due_date ?? null,
      frequency_days: payload.frequency_days ?? null,
      notes: payload.notes ?? null,
    } as never)
    .select("id")
    .single();

  if (insertError) throw insertError;

  const treatmentId = (treatment as { id: string } | null)?.id;

  const { error: updateError } = await supabaseClient
    .from("pet_pending_changes")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    } as never)
    .eq("id", pendingId);

  if (updateError) throw updateError;

  await supabaseClient.from("audit_log").insert({
    actor_id: reviewerId,
    clinic_id: clinicId,
    pet_id: petId,
    action: "pending_treatment_approved",
    details: { pending_id: pendingId, treatment_id: treatmentId, ...payload },
  } as never);
};

export const rejectPendingChange = async ({
  pendingId,
  petId,
  clinicId,
  reviewerId,
}: {
  pendingId: string;
  petId: string | null;
  clinicId: string;
  reviewerId: string;
}) => {
  const { error } = await supabaseClient
    .from("pet_pending_changes")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    } as never)
    .eq("id", pendingId);

  if (error) throw error;

  await supabaseClient.from("audit_log").insert({
    actor_id: reviewerId,
    clinic_id: clinicId,
    pet_id: petId,
    action: "pending_change_rejected",
    details: { pending_id: pendingId },
  } as never);
};
