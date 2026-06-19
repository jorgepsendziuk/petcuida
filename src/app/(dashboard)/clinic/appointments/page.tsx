"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";

import ui from "@/components/clinic/clinic-ui.module.css";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type AppointmentStatus = Database["public"]["Enums"]["clinic_appointment_status"];
type Appointment = Database["public"]["Tables"]["clinic_appointments"]["Row"] & {
  pets: { name: string } | null;
};

type GrantedPet = { pet_id: string; pet_name: string; tutor_id: string };

const statusLabel: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Faltou",
};

const chipClass: Record<AppointmentStatus, string> = {
  scheduled: ui.chipScheduled,
  completed: ui.chipCompleted,
  cancelled: ui.chipCancelled,
  no_show: ui.chipPending,
};

const fetchGrantedPets = async (clinicId: string): Promise<GrantedPet[]> => {
  const { data, error } = await supabaseClient
    .from("pet_access_grants")
    .select("pet_id, tutor_id, pets(name)")
    .eq("clinic_id", clinicId)
    .is("revoked_at", null);
  if (error) throw error;
  type Row = { pet_id: string; tutor_id: string; pets: { name: string } | null };
  return ((data ?? []) as Row[]).map((r) => ({
    pet_id: r.pet_id,
    tutor_id: r.tutor_id,
    pet_name: r.pets?.name ?? "—",
  }));
};

const fetchAppointments = async (clinicId: string) => {
  const from = dayjs().subtract(3, "day").startOf("day").toISOString();
  const { data, error } = await supabaseClient
    .from("clinic_appointments")
    .select("*, pets(name)")
    .eq("clinic_id", clinicId)
    .gte("scheduled_at", from)
    .order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as Appointment[];
};

function AppointmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPet = searchParams.get("pet");
  const { user } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(!!preselectedPet);
  const [completeApt, setCompleteApt] = useState<Appointment | null>(null);
  const [petId, setPetId] = useState(preselectedPet ?? "");
  const [scheduledAt, setScheduledAt] = useState(dayjs().add(1, "hour").format("YYYY-MM-DDTHH:mm"));
  const [reason, setReason] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [returnAt, setReturnAt] = useState("");

  const { data: membership, isLoading: membershipLoading } = useClinicMembership();
  const { data: pets } = useQuery({
    queryKey: ["clinic-granted-pets-options", membership?.clinic_id],
    queryFn: () => fetchGrantedPets(membership!.clinic_id),
    enabled: !!membership?.clinic_id,
  });
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["clinic-appointments", membership?.clinic_id],
    queryFn: () => fetchAppointments(membership!.clinic_id),
    enabled: !!membership?.clinic_id,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["clinic-appointments"] });
    void queryClient.invalidateQueries({ queryKey: ["partner-hub"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const pet = pets?.find((p) => p.pet_id === petId);
      if (!pet) throw new Error("Selecione um pet");
      const { error } = await supabaseClient.from("clinic_appointments").insert({
        clinic_id: membership!.clinic_id,
        pet_id: pet.pet_id,
        tutor_id: pet.tutor_id,
        scheduled_at: dayjs(scheduledAt).toISOString(),
        reason: reason || null,
        created_by: user!.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Consulta agendada!");
      setCreateOpen(false);
      setReason("");
      invalidate();
      if (preselectedPet) router.replace("/clinic/appointments");
    },
    onError: (e: Error) => message.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!completeApt) return;
      const { error } = await supabaseClient
        .from("clinic_appointments")
        .update({
          status: "completed",
          visit_notes: visitNotes || null,
          return_remind_at: returnAt ? dayjs(returnAt).toISOString() : null,
        } as never)
        .eq("id", completeApt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Visita registrada!");
      setCompleteApt(null);
      setVisitNotes("");
      setReturnAt("");
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient
        .from("clinic_appointments")
        .update({ status: "cancelled" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      message.info("Consulta cancelada.");
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (membershipLoading) {
    return <div className={ui.empty}><Spin /></div>;
  }

  if (!membership) {
    return (
      <div className={ui.page}>
        <div className={ui.empty}>Cadastre sua clínica primeiro.</div>
        <Link href="/clinic/setup" className={`${ui.btnPrimary} ${ui.btnBlock}`}>Cadastrar</Link>
      </div>
    );
  }

  const grouped = (appointments ?? []).reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = dayjs(apt.scheduled_at).format("YYYY-MM-DD");
    acc[key] = acc[key] ?? [];
    acc[key].push(apt);
    return acc;
  }, {});

  return (
    <div className={ui.page}>
      <section className={ui.hero}>
        <Link href="/clinic" className={ui.btnGhost}>← Início</Link>
        <span className={ui.badge}>{membership.clinic.name}</span>
        <h1 className={ui.title}>Agenda</h1>
        <p className={ui.subtitle}>Próximas consultas e prontuários resumidos.</p>
      </section>

      <button type="button" className={`${ui.btnPrimary} ${ui.btnBlock}`} onClick={() => setCreateOpen(true)}>
        + Nova consulta
      </button>

      {isLoading ? (
        <div className={ui.empty}>Carregando…</div>
      ) : !appointments?.length ? (
        <div className={ui.empty}>Nenhuma consulta nos últimos dias.</div>
      ) : (
        Object.entries(grouped).map(([dateKey, items]) => (
          <section key={dateKey}>
            <span className={ui.sectionLabel}>
              {dayjs(dateKey).format("dddd, D [de] MMMM")}
            </span>
            <div className={ui.cardList}>
              {items.map((apt) => (
                <article key={apt.id} className={ui.card}>
                  <div className={ui.cardHeader}>
                    <div>
                      <h3 className={ui.cardTitle}>{apt.pets?.name ?? "Pet"}</h3>
                      <p className={ui.cardMeta}>
                        {dayjs(apt.scheduled_at).format("HH:mm")}
                        {apt.reason ? ` · ${apt.reason}` : ""}
                      </p>
                      {apt.visit_notes && (
                        <p className={ui.cardMeta} style={{ marginTop: 6 }}>{apt.visit_notes}</p>
                      )}
                    </div>
                    <span className={`${ui.chip} ${chipClass[apt.status]}`}>
                      {statusLabel[apt.status]}
                    </span>
                  </div>
                  {apt.status === "scheduled" && (
                    <div className={ui.actions}>
                      <button
                        type="button"
                        className={ui.btnPrimary}
                        onClick={() => {
                          setCompleteApt(apt);
                          setVisitNotes("");
                        }}
                      >
                        Concluir
                      </button>
                      <Link href={`/clinic/pets/${apt.pet_id}`} className={ui.btnSecondary}>
                        Ficha
                      </Link>
                      <button type="button" className={ui.btnGhost} onClick={() => cancelMutation.mutate(apt.id)}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {createOpen && (
        <div className={ui.overlay} onClick={() => setCreateOpen(false)} role="presentation">
          <div className={ui.sheet} onClick={(e) => e.stopPropagation()}>
            <h2 className={ui.sheetTitle}>Nova consulta</h2>
            {!pets?.length ? (
              <p className={ui.cardMeta}>Nenhum pet com acesso. Peça permissão ao cuidador.</p>
            ) : (
              <div className={ui.formStack}>
                <div>
                  <label className={ui.formLabel}>Pet</label>
                  <select className={ui.field} value={petId} onChange={(e) => setPetId(e.target.value)}>
                    <option value="">Selecione</option>
                    {pets.map((p) => (
                      <option key={p.pet_id} value={p.pet_id}>{p.pet_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={ui.formLabel}>Data e hora</label>
                  <input
                    type="datetime-local"
                    className={ui.field}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className={ui.formLabel}>Motivo</label>
                  <input className={ui.field} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Retorno, vacina…" />
                </div>
                <button
                  type="button"
                  className={`${ui.btnPrimary} ${ui.btnBlock}`}
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Agendar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {completeApt && (
        <div className={ui.overlay} onClick={() => setCompleteApt(null)} role="presentation">
          <div className={ui.sheet} onClick={(e) => e.stopPropagation()}>
            <h2 className={ui.sheetTitle}>Concluir — {completeApt.pets?.name}</h2>
            <div className={ui.formStack}>
              <div>
                <label className={ui.formLabel}>Prontuário resumido</label>
                <textarea
                  className={`${ui.field} ${ui.fieldArea}`}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Resumo do atendimento…"
                />
              </div>
              <div>
                <label className={ui.formLabel}>Lembrete de retorno</label>
                <input
                  type="datetime-local"
                  className={ui.field}
                  value={returnAt}
                  onChange={(e) => setReturnAt(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`${ui.btnPrimary} ${ui.btnBlock}`}
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
              >
                Salvar visita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClinicAppointmentsPage() {
  return (
    <Suspense fallback={<div className={ui.empty}><Spin /></div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
