"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import dayjs from "dayjs";

import ui from "@/components/clinic/clinic-ui.module.css";
import panels from "@/components/dashboard/panels.module.css";
import { applyPendingTreatment, rejectPendingChange } from "@/lib/clinic/treatments";
import {
  formatTreatmentPayload,
  isClinicTreatmentPayload,
} from "@/lib/clinic/treatment-payload";
import { fetchTutorAppointments } from "@/components/clinic/use-partner-data";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type AccessRequest = Database["public"]["Tables"]["pet_access_requests"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};

type PendingChange = Database["public"]["Tables"]["pet_pending_changes"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};

type GrantRow = Database["public"]["Tables"]["pet_access_grants"]["Row"] & {
  clinic: { name: string } | null;
  pets: { name: string } | null;
};

export default function SharingPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sharing-page", user?.id],
    queryFn: async () => {
      const [requestsRes, pendingRes, grantsRes, appointments] = await Promise.all([
        supabaseClient
          .from("pet_access_requests")
          .select("*, clinic:clinics(name), pets(name)")
          .eq("tutor_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabaseClient
          .from("pet_pending_changes")
          .select("*, clinic:clinics(name), pets(name)")
          .eq("tutor_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabaseClient
          .from("pet_access_grants")
          .select("*, clinic:clinics(name), pets(name)")
          .eq("tutor_id", user!.id)
          .is("revoked_at", null)
          .order("created_at", { ascending: false }),
        fetchTutorAppointments(user!.id),
      ]);
      if (requestsRes.error) throw requestsRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (grantsRes.error) throw grantsRes.error;
      return {
        requests: (requestsRes.data ?? []) as AccessRequest[],
        pending: (pendingRes.data ?? []) as PendingChange[],
        grants: (grantsRes.data ?? []) as GrantRow[],
        appointments,
      };
    },
    enabled: !!user?.id,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["sharing-page"] });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const req = data?.requests.find((r) => r.id === requestId);
      if (!req) throw new Error("Pedido não encontrado");
      await supabaseClient
        .from("pet_access_requests")
        .update({ status: "approved", responded_at: new Date().toISOString() } as never)
        .eq("id", requestId);
      await supabaseClient.from("pet_access_grants").upsert(
        {
          clinic_id: req.clinic_id,
          pet_id: req.pet_id,
          tutor_id: req.tutor_id,
          granted_by: user!.id,
          request_id: requestId,
          expires_at: dayjs().add(365, "day").toISOString(),
          revoked_at: null,
        } as never,
        { onConflict: "clinic_id,pet_id" },
      );
    },
    onSuccess: () => {
      message.success("Acesso liberado.");
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await supabaseClient
        .from("pet_access_requests")
        .update({ status: "rejected", responded_at: new Date().toISOString() } as never)
        .eq("id", requestId);
    },
    onSuccess: () => {
      message.info("Pedido recusado.");
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (grantId: string) => {
      await supabaseClient
        .from("pet_access_grants")
        .update({ revoked_at: new Date().toISOString() } as never)
        .eq("id", grantId);
    },
    onSuccess: () => {
      message.success("Acesso revogado.");
      invalidate();
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
      await supabaseClient
        .from("pet_pending_changes")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        } as never)
        .eq("id", row.id);
    },
    onSuccess: (_, { approve }) => {
      message.success(approve ? "Alteração aplicada na ficha." : "Rascunho recusado.");
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (isLoading) {
    return <div className={ui.empty}><Spin /></div>;
  }

  return (
    <div className={ui.page}>
      <section className={ui.hero}>
        <Link href="/dashboard" className={ui.btnGhost}>← Início</Link>
        <span className={ui.badge}>LGPD-PET</span>
        <h1 className={ui.title}>Compartilhar</h1>
        <p className={ui.subtitle}>Você decide quem vê e atualiza a ficha de cada pet.</p>
      </section>

      <section className={`${panels.board} ${panels.boardShare}`}>
        <header className={panels.boardHeader}>
          <span className={panels.boardPin}>🔔</span>
          <h2 className={panels.boardTitle}>Pedidos pendentes</h2>
        </header>
        <div className={panels.boardBody}>
          {!data?.requests.length ? (
            <p className={panels.boardEmpty}>Nenhum pedido aguardando.</p>
          ) : (
            <ul className={panels.noticeList}>
              {data.requests.map((r) => (
                <li key={r.id}>
                  <strong>{r.clinic?.name}</strong>
                  <span>quer ver {r.pets?.name}</span>
                  <div className={panels.inlineActions}>
                    <button type="button" onClick={() => approveMutation.mutate(r.id)}>Liberar 1 ano</button>
                    <button type="button" className={panels.mutedBtn} onClick={() => rejectMutation.mutate(r.id)}>Recusar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={`${panels.board}`}>
        <header className={panels.boardHeader}>
          <span className={panels.boardPin}>📝</span>
          <h2 className={panels.boardTitle}>Rascunhos das clínicas</h2>
        </header>
        <div className={panels.boardBody}>
          {!data?.pending.length ? (
            <p className={panels.boardEmpty}>Nenhum rascunho pendente.</p>
          ) : (
            <ul className={panels.noticeList}>
              {data.pending.map((p) => (
                <li key={p.id}>
                  <strong>{p.clinic?.name}</strong>
                  <span>
                    {p.pets?.name} —{" "}
                    {isClinicTreatmentPayload(p.payload)
                      ? formatTreatmentPayload(p.payload)
                      : "alteração"}
                  </span>
                  <div className={panels.inlineActions}>
                    <button type="button" onClick={() => reviewPendingMutation.mutate({ row: p, approve: true })}>
                      Aplicar
                    </button>
                    <button type="button" className={panels.mutedBtn} onClick={() => reviewPendingMutation.mutate({ row: p, approve: false })}>
                      Recusar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={`${panels.board} ${panels.boardClinic}`}>
        <header className={panels.boardHeader}>
          <span className={panels.boardPin}>🏥</span>
          <h2 className={panels.boardTitle}>Consultas agendadas</h2>
        </header>
        <div className={panels.boardBody}>
          {!data?.appointments.length ? (
            <p className={panels.boardEmpty}>Nenhuma consulta nos próximos dias.</p>
          ) : (
            <ul className={panels.noticeList}>
              {data.appointments.map((apt) => (
                <li key={apt.id} className={panels.noticeClinic}>
                  <strong>{apt.clinics?.name}</strong>
                  <span>
                    {apt.pets?.name} · {dayjs(apt.scheduled_at).format("DD/MM HH:mm")}
                  </span>
                  {apt.reason && <em>{apt.reason}</em>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={`${panels.board}`}>
        <header className={panels.boardHeader}>
          <span className={panels.boardPin}>✅</span>
          <h2 className={panels.boardTitle}>Acessos ativos</h2>
        </header>
        <div className={panels.boardBody}>
          {!data?.grants.length ? (
            <p className={panels.boardEmpty}>Nenhuma clínica com acesso ativo.</p>
          ) : (
            <ul className={panels.noticeList}>
              {data.grants.map((g) => (
                <li key={g.id}>
                  <strong>{g.clinic?.name}</strong>
                  <span>{g.pets?.name}</span>
                  <em>
                    {g.expires_at ? `até ${dayjs(g.expires_at).format("DD/MM/YY")}` : "sem prazo"}
                  </em>
                  <div className={panels.inlineActions}>
                    <button type="button" className={panels.mutedBtn} onClick={() => revokeMutation.mutate(g.id)}>
                      Revogar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
