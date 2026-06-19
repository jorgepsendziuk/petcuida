"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

import { LandingShapes } from "@/components/landing/landing-shapes";
import { LandingDualHero } from "@/components/landing/landing-dual-hero";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useAuth } from "@/providers/auth-provider";

import styles from "./landing.module.css";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  if (isLoading || user) {
    return (
      <div className={`${styles.page} ${styles.pageFixed}`} style={{ display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.pageFixed}`}>
      <LandingShapes />

      <header className={styles.header}>
        <h1 className={styles.logo}>
          <BrandLogo />
        </h1>
        <Link href="/login" className={styles.enterBtn}>
          Entrar
        </Link>
      </header>

      <main className={styles.viewport}>
        <div className={styles.heroVisualWrap}>
          <div className={styles.visualBlob} aria-hidden />
          <LandingDualHero />
        </div>

        <div className={styles.heroCopy}>
          <p className={styles.valuePrimary}>GRÁTIS</p>
          <h2 className={styles.heroTitle}>
            <span className={styles.titleLine}>Cuide do</span>
            <span className={styles.titleLine}>seu pet</span>
            <span className={`${styles.titleLine} ${styles.titlePop}`}>com IA</span>
          </h2>
        </div>

        <div className={styles.ctaCluster}>
          <Link href="/comecar?camera=1" className={styles.ctaPrimary}>
            📸 Tirar foto do pet
          </Link>
          <Link href="/comecar?upload=1" className={styles.ctaSecondary}>
            🖼️ Enviar foto
          </Link>
          <Link href="/register?tipo=parceiro" className={styles.clinicCta}>
            <span className={styles.clinicCtaIcon} aria-hidden>
              🏥
            </span>
            <span className={styles.clinicCtaCopy}>
              <span className={styles.clinicCtaTitle}>Sou clínica ou veterinário</span>
              <span className={styles.clinicCtaHint}>Cadastro grátis →</span>
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
