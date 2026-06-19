"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import dayjs from "dayjs";

import { applyPendingTreatment, rejectPendingChange } from "@/lib/clinic/treatments";
import { isClinicTreatmentPayload } from "@/lib/clinic/treatment-payload";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

import styles from "./panels.module.css";

type AccessRequest = Database["public"]["Tables"]["pet_access_requests"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};

type PendingChange = Database["public"]["Tables"]["pet_pending_changes"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};

type SharingBoardProps = {
  requests: AccessRequest[];
  pending: PendingChange[];
};

export function SharingBoard({ requests, pending }: SharingBoardProps) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const req = requests.find((r) => r.id === requestId);
      if (!req) throw new Error("Pedido não encontrado");
      const { error: updateError } = await supabaseClient
        .from("pet_access_requests")
        .update({ status: "approved", responded_at: new Date().toISOString() } as never)
        .eq("id", requestId);
      if (updateError) throw updateError;
      const { error: grantError } = await supabaseClient.from("pet_access_grants").upsert(
        {
          clinic_id: req.clinic_id,
          pet_id: req.pet_id,
          tutor_id: req.tutor_id,
          granted_by: user!.id,
          request_id: requestId,
          expires_at: dayjs().add(90, "day").toISOString(),
          revoked_at: null,
        } as never,
        { onConflict: "clinic_id,pet_id" },
      );
      if (grantError) throw grantError;
    },
    onSuccess: () => {
      message.success("Acesso liberado.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-hub"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabaseClient
        .from("pet_access_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() } as never)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      message.info("Pedido recusado.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-hub"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const reviewPendingMutation = useMutation({
    mutationFn: async ({ row, approve }: { row: PendingChange; approve: boolean }) => {
      if (!approve) {
        await rejectPendingChange({
          pendingId: row.id,
          petId: row.pet_id,
          clinicId: row.clinic_id,
          reviewerId: user!.id,
        });
        return;
      }
      if (
        (row.change_type === "treatment" || row.change_type === "treatment_draft") &&
        row.pet_id &&
        isClinicTreatmentPayload(row.payload)
      ) {
        await applyPendingTreatment({
          pendingId: row.id,
          petId: row.pet_id,
          tutorId: row.tutor_id!,
          clinicId: row.clinic_id,
          payload: row.payload,
          reviewerId: user!.id,
        });
        return;
      }
      const { error } = await supabaseClient
        .from("pet_pending_changes")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        } as never)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_, { approve }) => {
      message.success(approve ? "Alteração aplicada." : "Rascunho recusado.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard-hub"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (requests.length === 0 && pending.length === 0) return null;

  return (
    <section className={`${styles.board} ${styles.boardShare}`}>
      <header className={styles.boardHeader}>
        <span className={styles.boardPin}>🤝</span>
        <h2 className={styles.boardTitle}>Compartilhar</h2>
      </header>
      <div className={styles.boardBody}>
        <ul className={styles.noticeList}>
          {requests.map((r) => (
            <li key={r.id}>
              <strong>{r.clinic?.name}</strong>
              <span>quer ver {r.pets?.name}</span>
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}>
                  Liberar
                </button>
                <button type="button" className={styles.mutedBtn} onClick={() => rejectMutation.mutate(r.id)}>
                  Recusar
                </button>
              </div>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id}>
              <strong>{p.clinic?.name}</strong>
              <span>alteração em {p.pets?.name}</span>
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  onClick={() => reviewPendingMutation.mutate({ row: p, approve: true })}
                  disabled={reviewPendingMutation.isPending}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  className={styles.mutedBtn}
                  onClick={() => reviewPendingMutation.mutate({ row: p, approve: false })}
                >
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
