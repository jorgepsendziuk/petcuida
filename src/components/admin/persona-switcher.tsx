"use client";

import Link from "next/link";
import { Segmented } from "antd";

import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { PERSONA_LABELS, type AppPersona } from "@/lib/persona";
import { usePersona } from "@/providers/persona-provider";

import styles from "./persona-toggle.module.css";

type PersonaToggleProps = {
  compact?: boolean;
};

/** Alternância Cuidador ↔ Parceiro no hub */
export function PersonaToggle({ compact }: PersonaToggleProps) {
  const { persona, setPersona, canSwitchPersona, hasPartnerRole } = usePersona();

  if (!canSwitchPersona) {
    if (!hasPartnerRole) {
      return (
        <Link href="/clinic/setup" className={styles.becomePartner}>
          Sou parceiro
        </Link>
      );
    }
    return null;
  }

  const options = (["caregiver", "partner"] as AppPersona[]).map((value) => ({
    value,
    label: compact ? (value === "caregiver" ? "🐾 Tutor" : "🏥 Clínica") : PERSONA_LABELS[value],
  }));

  return (
    <Segmented
      size="small"
      className={styles.segmented}
      value={persona === "admin" ? "caregiver" : persona}
      options={options}
      onChange={(value) => setPersona(value as AppPersona)}
    />
  );
}

/** Admin: todas as visões */
export const PersonaSwitcher = () => {
  const { persona, setPersona, canSwitchPersona } = usePersona();
  const { isPlatformAdmin } = usePlatformAdmin();

  if (!isPlatformAdmin && !canSwitchPersona) return null;

  const options = (
    isPlatformAdmin
      ? (["admin", "caregiver", "partner"] as AppPersona[])
      : (["caregiver", "partner"] as AppPersona[])
  ).map((value) => ({
    value,
    label: PERSONA_LABELS[value],
  }));

  return (
    <Segmented
      size="small"
      value={persona}
      options={options}
      onChange={(value) => setPersona(value as AppPersona)}
    />
  );
};
