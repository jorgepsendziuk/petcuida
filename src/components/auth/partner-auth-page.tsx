"use client";

import { PastelAuthPage, pastelAuthStyles as styles } from "@/components/auth/pastel-auth-page";
import { supabaseClient } from "@/lib/supabase/client";

const PARTNER_BENEFITS = [
  {
    icon: "🔍",
    iconClass: styles.iconWrapTeal,
    title: "Tutores te encontram",
    desc: "Sua clínica no catálogo do app",
  },
  {
    icon: "📋",
    iconClass: styles.iconWrapViolet,
    title: "Ficha compartilhada",
    desc: "Só com ok do tutor, sempre",
  },
  {
    icon: "💊",
    iconClass: styles.iconWrapOrange,
    title: "Tratamentos no radar",
    desc: "Receitas e lembretes organizados",
  },
  {
    icon: "💚",
    iconClass: styles.iconWrapPink,
    title: "Grátis sempre",
    desc: "Sem mensalidade para parceiros",
  },
] as const;

const resolvePartnerRedirect = async (userId: string) => {
  const { data } = await supabaseClient
    .from("clinic_members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return data ? "/clinic" : "/clinic/setup";
};

export function PartnerAuthPage() {
  return (
    <PastelAuthPage
      variant="partner"
      badge="Grátis sempre"
      titleLine1="Sua clínica"
      titleLine2={
        <>
          no <span className={styles.heroPop}>app</span>
        </>
      }
      benefits={PARTNER_BENEFITS}
      afterAuthPath="/clinic"
      successMessage="Pronto! Vamos à área da clínica."
      resolveRedirect={resolvePartnerRedirect}
    />
  );
}
