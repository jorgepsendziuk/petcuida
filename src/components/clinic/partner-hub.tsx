"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";

import { PersonaToggle } from "@/components/admin/persona-switcher";
import { LandingShapes } from "@/components/landing/landing-shapes";
import { EmbeddedGenealogyTree } from "@/components/pets/embedded-genealogy-tree";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

import ui from "./clinic-ui.module.css";
import hubStyles from "./partner-hub.module.css";
import { usePartnerData } from "./use-partner-data";

const auditLabel: Record<string, string> = {
  treatment_added: "Cuidado registrado",
  treatment_draft_created: "Rascunho enviado",
  pending_treatment_approved: "Rascunho aprovado",
  pending_change_rejected: "Alteração recusada",
  grant_approved: "Acesso liberado",
};

export function PartnerHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useClinicMembership();
  const { data, isLoading } = usePartnerData(membership?.clinic_id);
  const [auditOpen, setAuditOpen] = useState(false);

  const { data: ownPets = [], isLoading: ownPetsLoading } = useQuery({
    queryKey: ["pets", user?.id, "partner-hub"],
    queryFn: async () => {
      const { data: rows, error } = await supabaseClient
        .from("pets")
        .select("id")
        .eq("owner_id", user!.id);
      if (error) throw error;
      return rows ?? [];
    },
    enabled: !!user?.id && !!membership,
  });

  const notifyCount = (data?.pendingRequests ?? 0) + (data?.pendingDrafts ?? 0);

  if (membershipLoading) {
    return (
      <div className={hubStyles.shell}>
        <div className={hubStyles.loading}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className={hubStyles.shell}>
        <LandingShapes />
        <div className={hubStyles.setupWrap}>
          <p className={hubStyles.setupEmoji}>🏥</p>
          <h1 className={hubStyles.setupTitle}>Sua clínica aqui</h1>
          <p className={hubStyles.setupSub}>Cadastre em poucos passos e comece a atender.</p>
          <button type="button" className={`${ui.btnPrimary} ${ui.btnBlock}`} onClick={() => router.push("/clinic/setup")}>
            Cadastrar clínica
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={hubStyles.shell}>
      <LandingShapes />

      <header className={hubStyles.topBar}>
        <Link href="/clinic" className={hubStyles.brand}>
          <BrandLogo />
        </Link>
        <div className={hubStyles.topActions}>
          <PersonaToggle compact />
          {notifyCount > 0 && (
            <span className={hubStyles.notifyBadge} aria-label={`${notifyCount} pendências`}>
              {notifyCount}
            </span>
          )}
          <button type="button" className={hubStyles.iconBtn} onClick={() => setAuditOpen((v) => !v)} aria-label="Atividade">
            📋
          </button>
          <Link href="/clinic/settings" className={hubStyles.iconBtn} aria-label="Configurações">
            ⚙️
          </Link>
        </div>
      </header>

      <main className={hubStyles.main}>
        <section className={ui.hero}>
          <span className={ui.badge}>{membership.clinic.name}</span>
          <h1 className={ui.title}>Área do parceiro</h1>
          <p className={ui.subtitle}>Consultas, fichas compartilhadas e pedidos de acesso — tudo num lugar.</p>
        </section>

        <div className={ui.statGrid}>
          <Link href="/clinic/appointments" className={ui.statTile}>
            <span className={ui.statEmoji}>📅</span>
            <span className={ui.statValue}>{data?.todayAppointments.length ?? 0}</span>
            <span className={ui.statLabel}>Hoje</span>
          </Link>
          <Link href="/clinic/access" className={ui.statTile}>
            <span className={ui.statEmoji}>🔔</span>
            <span className={ui.statValue}>{data?.pendingRequests ?? 0}</span>
            <span className={ui.statLabel}>Pedidos</span>
          </Link>
          <Link href="/clinic/pets" className={ui.statTile}>
            <span className={ui.statEmoji}>🐾</span>
            <span className={ui.statValue}>{data?.activeGrants ?? 0}</span>
            <span className={ui.statLabel}>Pets</span>
          </Link>
          <Link href="/clinic/access" className={ui.statTile}>
            <span className={ui.statEmoji}>📝</span>
            <span className={ui.statValue}>{data?.pendingDrafts ?? 0}</span>
            <span className={ui.statLabel}>Rascunhos</span>
          </Link>
        </div>

        <div className={ui.quickGrid}>
          <Link href="/clinic/access" className={ui.quickTile}>
            <span className={ui.quickEmoji}>🔍</span>
            Buscar CPF
          </Link>
          <Link href="/clinic/appointments" className={ui.quickTile}>
            <span className={ui.quickEmoji}>📆</span>
            Agenda
          </Link>
          <Link href="/clinic/pets" className={ui.quickTile}>
            <span className={ui.quickEmoji}>💚</span>
            Fichas
          </Link>
          <Link href="/clinic/settings" className={ui.quickTile}>
            <span className={ui.quickEmoji}>🏢</span>
            Clínica
          </Link>
        </div>

        <section className={hubStyles.familySection}>
          <span className={ui.sectionLabel}>Seus pets pessoais</span>
          {ownPetsLoading ? (
            <div className={ui.empty}>Carregando…</div>
          ) : ownPets.length > 0 && user?.id ? (
            <div className={hubStyles.familyTree}>
              <EmbeddedGenealogyTree userId={user.id} />
            </div>
          ) : (
            <div className={ui.empty}>
              Você ainda não cadastrou pets nesta conta.
              <div style={{ marginTop: 12 }}>
                <button type="button" className={ui.btnSecondary} onClick={() => router.push("/pets/create")}>
                  Cadastrar pet
                </button>
              </div>
            </div>
          )}
        </section>

        <section>
          <span className={ui.sectionLabel}>Consultas de hoje</span>
          {isLoading ? (
            <div className={ui.empty}>Carregando…</div>
          ) : !data?.todayAppointments.length ? (
            <div className={ui.empty}>
              Nenhuma consulta hoje.
              <div style={{ marginTop: 12 }}>
                <Link href="/clinic/appointments" className={ui.btnSecondary}>
                  Agendar
                </Link>
              </div>
            </div>
          ) : (
            <div className={ui.cardList}>
              {data.todayAppointments.map((apt) => (
                <article key={apt.id} className={ui.card}>
                  <div className={ui.cardHeader}>
                    <div>
                      <h3 className={ui.cardTitle}>{apt.pets?.name ?? "Pet"}</h3>
                      <p className={ui.cardMeta}>
                        {dayjs(apt.scheduled_at).format("HH:mm")}
                        {apt.reason ? ` · ${apt.reason}` : ""}
                      </p>
                    </div>
                    <span className={`${ui.chip} ${ui.chipScheduled}`}>Hoje</span>
                  </div>
                  <div className={ui.actions}>
                    <Link href={`/clinic/pets/${apt.pet_id}`} className={ui.btnPrimary}>
                      Ficha
                    </Link>
                    <Link href="/clinic/appointments" className={ui.btnGhost}>
                      Ver agenda
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {!!data?.grantedPets.length && (
          <section>
            <span className={ui.sectionLabel}>Pets recentes</span>
            <div className={ui.cardList}>
              {data.grantedPets.map((pet) => (
                <Link key={pet.grant_id} href={`/clinic/pets/${pet.pet_id}`} className={ui.card}>
                  <div className={ui.cardHeader}>
                    <div>
                      <h3 className={ui.cardTitle}>{pet.pet_name}</h3>
                      <p className={ui.cardMeta}>{pet.species}</p>
                    </div>
                    <span className={`${ui.chip} ${ui.chipCompleted}`}>Acesso</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {auditOpen && !!data?.recentAudit.length && (
          <section>
            <span className={ui.sectionLabel}>Atividade recente</span>
            <div className={ui.cardList}>
              {data.recentAudit.map((row) => (
                <article key={row.id} className={ui.card}>
                  <p className={ui.cardTitle}>{auditLabel[row.action] ?? row.action}</p>
                  <p className={ui.cardMeta}>{dayjs(row.created_at).format("DD/MM HH:mm")}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
