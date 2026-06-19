"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spin } from "antd";

import { PersonaToggle } from "@/components/admin/persona-switcher";
import { LandingShapes } from "@/components/landing/landing-shapes";
import { BrandLogo } from "@/components/ui/brand-logo";
import { EmbeddedGenealogyTree } from "@/components/pets/embedded-genealogy-tree";
import { syncGuestPetToAccount } from "@/lib/sync-guest-pet";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";

import { AgendaStrip } from "./agenda-strip";
import { AssistantModal } from "./assistant-modal";
import { CareBoard } from "./care-board";
import { ClinicAppointmentsBoard } from "./clinic-appointments-board";
import { PartnersMapOverlay } from "./partners-map-overlay";
import { ProfilePanel } from "./profile-panel";
import { RemindersPanel } from "./reminders-panel";
import { SharingBoard } from "./sharing-board";
import { useDashboardData } from "./use-dashboard-data";

import styles from "./caregiver-hub.module.css";

export function CaregiverHub() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useDashboardData(user?.id);

  const [remindersOpen, setRemindersOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void syncGuestPetToAccount(user.id).then((petId) => {
      if (petId) void queryClient.invalidateQueries({ queryKey: ["dashboard-hub", user.id] });
    });
  }, [user?.id, queryClient]);

  const pendingReminders = (data?.reminders ?? []).filter((r) => !r.delivered_at);
  const hasSharing = (data?.accessRequests.length ?? 0) > 0 || (data?.pendingChanges.length ?? 0) > 0;
  const notifyCount =
    pendingReminders.length +
    (data?.accessRequests.length ?? 0) +
    (data?.pendingChanges.length ?? 0) +
    (data?.clinicAppointments?.length ?? 0);

  return (
    <div className={styles.shell}>
      <LandingShapes />

      <header className={styles.topBar}>
        <Link href="/dashboard" className={styles.brand}>
          <BrandLogo />
        </Link>
        <div className={styles.topIcons}>
          <PersonaToggle compact />
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.partnersIcon} ${partnersOpen ? styles.iconBtnActive : ""}`}
            onClick={() => setPartnersOpen(true)}
            aria-label="Parceiros próximos"
          >
            🏥
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.bell} ${notifyCount > 0 ? styles.bellHasItems : ""}`}
            onClick={() => setRemindersOpen(true)}
            aria-label="Lembretes"
          >
            🔔
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${assistantOpen ? styles.iconBtnActive : ""}`}
            onClick={() => setAssistantOpen(true)}
            aria-label="Assistente"
          >
            ✨
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.profileIcon} ${profileOpen ? styles.iconBtnActive : ""}`}
            onClick={() => setProfileOpen(true)}
            aria-label="Perfil"
          >
            👤
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.logoutIcon}`}
            onClick={() => signOut()}
            aria-label="Sair"
          >
            ⎋
          </button>
        </div>
      </header>

      <div className={styles.hub}>
        <section className={styles.treeZone} aria-label="Árvore de pets">
          <p className={styles.treeLabel}>Família</p>
          <div className={styles.treeInner}>
            {user?.id ? (
              <EmbeddedGenealogyTree userId={user.id} />
            ) : (
              <Spin />
            )}
          </div>
          <Link href="/pets/create" className={styles.addFab} aria-label="Novo pet">
            +
          </Link>
        </section>

        <aside className={styles.sideColumn}>
          <CareBoard items={data?.careFeed ?? []} loading={isLoading} />
          {hasSharing && (
            <SharingBoard
              requests={data?.accessRequests ?? []}
              pending={data?.pendingChanges ?? []}
            />
          )}
          <ClinicAppointmentsBoard appointments={data?.clinicAppointments ?? []} />
          <AgendaStrip
            reminders={data?.reminders ?? []}
            careFeed={data?.careFeed ?? []}
            clinicAppointments={data?.clinicAppointments ?? []}
          />
        </aside>
      </div>

      <RemindersPanel
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        reminders={data?.reminders ?? []}
      />
      <PartnersMapOverlay
        open={partnersOpen}
        onClose={() => setPartnersOpen(false)}
        clinics={data?.clinics ?? []}
      />
      <AssistantModal open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
