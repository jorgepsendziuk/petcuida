"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Spin } from "antd";

import { PartnerAuthPage } from "@/components/auth/partner-auth-page";
import { PastelAuthPage, pastelAuthStyles as styles } from "@/components/auth/pastel-auth-page";
import { PERSONA_STORAGE_KEY } from "@/lib/persona";
import { supabaseClient } from "@/lib/supabase/client";
import { syncGuestPetToAccount } from "@/lib/sync-guest-pet";

import landingStyles from "@/app/landing.module.css";

const TUTOR_BENEFITS = [
  {
    icon: "📸",
    iconClass: styles.iconWrapTeal,
    title: "Cadastro com IA",
    desc: "Foto vira ficha do pet na hora",
  },
  {
    icon: "💊",
    iconClass: styles.iconWrapViolet,
    title: "Lembretes",
    desc: "Medicamentos e consultas no radar",
  },
  {
    icon: "🏥",
    iconClass: styles.iconWrapOrange,
    title: "Sua clínica",
    desc: "Compartilhe só o que quiser",
  },
  {
    icon: "💚",
    iconClass: styles.iconWrapPink,
    title: "Grátis sempre",
    desc: "Para tutores e clínicas",
  },
] as const;

function LoginContent() {
  const searchParams = useSearchParams();
  const isParceiro = searchParams.get("tipo") === "parceiro";
  const next = searchParams.get("next");

  if (isParceiro) {
    return <PartnerAuthPage />;
  }

  const afterAuthPath = next?.startsWith("/") ? next : "/dashboard";

  return (
    <PastelAuthPage
      variant="tutor"
      badge="Grátis sempre"
      titleLine1="Cuide do"
      titleLine2={
        <>
          seu pet <span className={styles.heroPopWarm}>com IA</span>
        </>
      }
      benefits={TUTOR_BENEFITS}
      afterAuthPath={afterAuthPath}
      successMessage="Pronto!"
      resolveRedirect={async (userId) => {
        const { data: membership } = await supabaseClient
          .from("clinic_members")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (membership) {
          localStorage.setItem(PERSONA_STORAGE_KEY, "partner");
          return "/clinic";
        }

        const petId = await syncGuestPetToAccount(userId);
        return petId ? `/pets/${petId}` : null;
      }}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={`${landingStyles.page} ${landingStyles.pageFixed}`} style={{ display: "grid", placeItems: "center" }}>
          <Spin size="large" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
