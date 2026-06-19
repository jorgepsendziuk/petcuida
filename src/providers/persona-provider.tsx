"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import {
  type AppPersona,
  isAppPersona,
  PERSONA_STORAGE_KEY,
} from "@/lib/persona";
import { useAuth } from "@/providers/auth-provider";

type PersonaContextValue = {
  persona: AppPersona;
  setPersona: (persona: AppPersona) => void;
  isPreviewMode: boolean;
  canSwitchPersona: boolean;
  hasPartnerRole: boolean;
};

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

export const PersonaProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isPlatformAdmin, isLoading: adminLoading } = usePlatformAdmin();
  const { data: membership, isLoading: membershipLoading } = useClinicMembership();
  const [persona, setPersonaState] = useState<AppPersona>("caregiver");

  const hasPartnerRole = Boolean(membership);
  const isLoading = authLoading || adminLoading || (!!user?.id && membershipLoading);

  useEffect(() => {
    if (isLoading) return;

    const stored = localStorage.getItem(PERSONA_STORAGE_KEY);

    if (isPlatformAdmin) {
      if (stored && isAppPersona(stored)) {
        setPersonaState(stored);
      } else {
        setPersonaState("admin");
      }
      return;
    }

    if (stored === "partner") {
      setPersonaState("partner");
      return;
    }

    if (stored === "caregiver") {
      setPersonaState("caregiver");
      return;
    }

    // Primeira visita: parceiro com clínica vinculada abre como parceiro
    setPersonaState(hasPartnerRole ? "partner" : "caregiver");
  }, [hasPartnerRole, isLoading, isPlatformAdmin]);

  const setPersona = useCallback(
    (next: AppPersona) => {
      if (isPlatformAdmin) {
        setPersonaState(next);
        localStorage.setItem(PERSONA_STORAGE_KEY, next);
        return;
      }

      if (next === "admin") return;

      if (next === "partner" && !hasPartnerRole) {
        setPersonaState("partner");
        localStorage.setItem(PERSONA_STORAGE_KEY, "partner");
        return;
      }

      setPersonaState(next === "partner" ? "partner" : "caregiver");
      localStorage.setItem(PERSONA_STORAGE_KEY, next === "partner" ? "partner" : "caregiver");
    },
    [hasPartnerRole, isPlatformAdmin],
  );

  const effectivePersona: AppPersona = useMemo(() => {
    if (isPlatformAdmin) return persona;
    if (persona === "admin") return "caregiver";
    return persona === "partner" ? "partner" : "caregiver";
  }, [isPlatformAdmin, persona]);

  const value = useMemo<PersonaContextValue>(
    () => ({
      persona: effectivePersona,
      setPersona,
      isPreviewMode: isPlatformAdmin && effectivePersona !== "admin",
      canSwitchPersona: isPlatformAdmin || hasPartnerRole,
      hasPartnerRole,
    }),
    [effectivePersona, hasPartnerRole, isPlatformAdmin, setPersona],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
};

export const usePersona = () => {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return ctx;
};
