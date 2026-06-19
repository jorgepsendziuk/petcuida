"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { App, Spin } from "antd";

import { ClinicTreatmentForm } from "@/components/clinic/clinic-treatment-form";
import ui from "@/components/clinic/clinic-ui.module.css";
import { OrganicItem, OrganicLabel, OrganicStage } from "@/components/layout/organic-stage";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { formatCpf, isValidCpfLength, normalizeCpf } from "@/lib/cpf";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

import styles from "./clinic-access.module.css";

type TutorSearchRow = Database["public"]["Functions"]["find_tutor_by_cpf"]["Returns"][number];

export default function ClinicAccessPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: membership, isLoading } = useClinicMembership();
  const [cpf, setCpf] = useState("");
  const [draftRow, setDraftRow] = useState<TutorSearchRow | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (value: string) => {
      const { data, error } = await supabaseClient.rpc("find_tutor_by_cpf", {
        p_cpf: normalizeCpf(value),
      } as never);
      if (error) throw error;
      return (data ?? []) as TutorSearchRow[];
    },
    onError: (error: Error) => message.error(error.message),
  });

  const requestMutation = useMutation({
    mutationFn: async (row: TutorSearchRow) => {
      const { error } = await supabaseClient.from("pet_access_requests").insert({
        clinic_id: membership!.clinic_id,
        pet_id: row.pet_id,
        tutor_id: row.tutor_id,
        requested_by: user!.id,
        message: `A clínica ${membership!.clinic.name} solicita acesso à ficha de ${row.pet_name}.`,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => message.success("Pedido enviado. O cuidador precisa aprovar."),
    onError: (error: Error) => message.error(error.message),
  });

  if (isLoading) {
    return (
      <OrganicStage>
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      </OrganicStage>
    );
  }

  if (!membership) {
    return (
      <OrganicStage>
        <OrganicItem tier={1}>
          <div className={styles.setupPrompt}>
            <p style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>
              Você precisa cadastrar uma clínica primeiro.
            </p>
            <button type="button" className={styles.setupBtn} onClick={() => router.push("/clinic/setup")}>
              Cadastrar clínica
            </button>
          </div>
        </OrganicItem>
      </OrganicStage>
    );
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidCpfLength(cpf)) {
      message.warning("Informe um CPF com 11 dígitos.");
      return;
    }
    searchMutation.mutate(cpf);
  };

  return (
    <OrganicStage>
      <OrganicItem tier={1}>
        <Link href="/clinic" className={styles.linkCard} style={{ marginBottom: 12 }}>
          ← Início
        </Link>
        <span className={styles.clinicBadge}>{membership.clinic.name}</span>
        <h2 className={styles.heroTitle}>Buscar tutor</h2>
        <p className={styles.heroSub}>
          Digite o CPF do cuidador. Só aparecem pets de quem habilitou compartilhamento.
        </p>
      </OrganicItem>

      <OrganicItem tier={2}>
        <form className={styles.searchForm} onSubmit={onSearch}>
          <input
            className={styles.cpfInput}
            placeholder="000.000.000-00"
            maxLength={14}
            value={cpf}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCpf(formatCpf(e.target.value))}
            aria-label="CPF do cuidador"
          />
          <button type="submit" className={styles.searchBtn} disabled={searchMutation.isPending}>
            {searchMutation.isPending ? "Buscando…" : "🔍 Buscar"}
          </button>
        </form>
      </OrganicItem>

      {searchMutation.data && (
        <OrganicItem tier={3}>
          <OrganicLabel>Pets encontrados</OrganicLabel>
          {searchMutation.data.length === 0 ? (
            <div className={styles.emptyResult}>
              Nenhum pet para este CPF (ou compartilhamento desabilitado).
            </div>
          ) : (
            <div className={styles.resultList}>
              {searchMutation.data.map((row) => (
                <div key={row.pet_id} className={styles.resultCard}>
                  <div className={styles.resultPet}>{row.pet_name}</div>
                  <div className={styles.resultTutor}>
                    {row.full_name ?? "Cuidador"} · {row.pet_species}
                  </div>
                  <div className={styles.resultActions}>
                    <button
                      type="button"
                      className={styles.actionPrimary}
                      disabled={requestMutation.isPending}
                      onClick={() => requestMutation.mutate(row)}
                    >
                      Pedir acesso
                    </button>
                    <button
                      type="button"
                      className={styles.actionSecondary}
                      onClick={() => setDraftRow(row)}
                    >
                      Rascunho de cuidado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OrganicItem>
      )}

      <OrganicItem tier={4} scatter={1}>
        <Link href="/clinic/pets" className={styles.linkCard}>
          Ver pets com acesso liberado →
        </Link>
      </OrganicItem>

      {draftRow && user && (
        <div className={ui.overlay} onClick={() => setDraftRow(null)} role="presentation">
          <div className={ui.sheet} onClick={(e) => e.stopPropagation()}>
            <h2 className={ui.sheetTitle}>Rascunho — {draftRow.pet_name}</h2>
            <p className={ui.cardMeta} style={{ marginBottom: 12 }}>
              O cuidador precisa aprovar antes de ir para a ficha.
            </p>
            <ClinicTreatmentForm
              clinicId={membership.clinic_id}
              petId={draftRow.pet_id}
              tutorId={draftRow.tutor_id}
              userId={user.id}
              hasGrant={false}
              onSuccess={() => setDraftRow(null)}
            />
          </div>
        </div>
      )}
    </OrganicStage>
  );
}
