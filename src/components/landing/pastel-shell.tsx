import type { ReactNode } from "react";
import Link from "next/link";

import { LandingShapes } from "@/components/landing/landing-shapes";
import { BrandLogo } from "@/components/ui/brand-logo";
import styles from "@/app/landing.module.css";

type PastelShellProps = {
  children: ReactNode;
  showLogin?: boolean;
  backHref?: string;
  backLabel?: string;
  fixed?: boolean;
};

export function PastelShell({
  children,
  showLogin = true,
  backHref,
  backLabel = "Voltar",
  fixed = false,
}: PastelShellProps) {
  return (
    <div className={`${styles.page} ${fixed ? styles.pageFixed : ""}`}>
      <LandingShapes />

      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <BrandLogo />
        </Link>
        {backHref ? (
          <Link href={backHref} className={styles.enterBtn}>
            {backLabel}
          </Link>
        ) : showLogin ? (
          <Link href="/login" className={styles.enterBtn}>
            Entrar
          </Link>
        ) : null}
      </header>

      <main className={fixed ? styles.shellMain : undefined}>{children}</main>

      {!fixed && (
        <footer className={styles.footer}>
          <span className={styles.footerPaw}>🐾</span>
        </footer>
      )}
    </div>
  );
}
