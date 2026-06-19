"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

import { PhotoScanHero } from "@/components/landing/photo-scan-hero";
import { PastelShell } from "@/components/landing/pastel-shell";
import {
  draftToScanBadges,
  formatAge,
  getGuestPet,
  speciesEmoji,
  speciesLabel,
  type GuestPetDraft,
} from "@/lib/guest-pet";
import { useAuth } from "@/providers/auth-provider";

import landing from "@/app/landing.module.css";
import styles from "./inicio.module.css";

const TEASERS = [
  { icon: "💉", title: "Vacinas", text: "Organize e receba lembretes" },
  { icon: "💊", title: "Tratamentos", text: "Vermífugos e medicamentos" },
  { icon: "🏥", title: "Clínicas", text: "Compartilhe só com quem autorizar" },
  { icon: "🔒", title: "Privacidade", text: "Você controla cada acesso" },
] as const;

export default function InicioGuestPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [draft, setDraft] = useState<GuestPetDraft | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace("/dashboard");
      return;
    }

    const pet = getGuestPet();
    if (!pet) {
      router.replace("/");
      return;
    }

    setDraft(pet);
    setReady(true);
  }, [isLoading, user, router]);

  if (!ready || !draft) {
    return (
      <div className={landing.page} style={{ display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const badges = draftToScanBadges(draft);
  const registerHref = "/register?tipo=cuidador&next=" + encodeURIComponent("/dashboard");

  return (
    <PastelShell showLogin={false}>
      <div className={styles.preview}>
        <div className={styles.heroBlock}>
          <PhotoScanHero
            photoUrl={draft.photo}
            emoji={speciesEmoji[draft.species]}
            scanning={false}
            badges={badges}
          />
          <h1 className={styles.petName}>{draft.name}</h1>
          <p className={styles.petMeta}>
            {speciesLabel[draft.species]}
            {draft.breed ? ` · ${draft.breed}` : ""}
            {draft.estimatedAgeYears != null ? ` · ${formatAge(draft.estimatedAgeYears)}` : ""}
          </p>
          <Link href="/comecar" className={styles.editLink}>
            Editar dados
          </Link>
        </div>

        <p className={styles.sectionLabel}>Próximos passos</p>
        <div className={styles.teaserGrid}>
          {TEASERS.map((t) => (
            <div key={t.title} className={styles.teaserCard}>
              <span className={styles.teaserIcon}>{t.icon}</span>
              <p className={styles.teaserTitle}>{t.title}</p>
              <p className={styles.teaserText}>{t.text}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaBlock}>
          <Link href={registerHref} className={styles.primaryBtn}>
            Criar conta para salvar
          </Link>
          <Link href="/login?next=/dashboard" className={styles.secondaryLink}>
            Já tenho conta — entrar
          </Link>
          <p className={styles.hint}>
            Sua ficha fica salva neste aparelho até você criar a conta.
          </p>
        </div>
      </div>
    </PastelShell>
  );
}
