"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Spin } from "antd";

import { PastelShell } from "@/components/landing/pastel-shell";
import { continueWithEmail } from "@/lib/auth-continue";
import { PERSONA_STORAGE_KEY } from "@/lib/persona";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

import landingStyles from "@/app/landing.module.css";
import styles from "./pastel-auth.module.css";

export type PastelAuthBenefit = {
  icon: string;
  iconClass: string;
  title: string;
  desc: string;
};

type PastelAuthPageProps = {
  badge: string;
  titleLine1: string;
  titleLine2: ReactNode;
  benefits: readonly PastelAuthBenefit[];
  afterAuthPath: string;
  successMessage: string;
  variant?: "tutor" | "partner";
  resolveRedirect?: (userId: string) => Promise<string | null>;
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function PastelAuthPage({
  badge,
  titleLine1,
  titleLine2,
  benefits,
  afterAuthPath,
  successMessage,
  variant = "tutor",
  resolveRedirect,
}: PastelAuthPageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { message } = App.useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectAfterAuth = async () => {
    if (variant === "partner") {
      localStorage.setItem(PERSONA_STORAGE_KEY, "partner");
    } else if (variant === "tutor") {
      localStorage.setItem(PERSONA_STORAGE_KEY, "caregiver");
    }

    const { data } = await supabaseClient.auth.getSession();
    const userId = data.session?.user?.id;

    if (userId && resolveRedirect) {
      try {
        const override = await resolveRedirect(userId);
        if (override) {
          router.replace(override);
          return;
        }
      } catch (error) {
        console.error("[PastelAuth] Falha ao resolver redirect:", error);
      }
    }

    router.replace(afterAuthPath);
  };

  useEffect(() => {
    if (!authLoading && user) {
      void redirectAfterAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${afterAuthPath}`,
      },
    });
    setBusy(false);
    if (error) message.error(error.message);
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      message.warning("Informe e-mail válido e senha com pelo menos 6 caracteres.");
      return;
    }

    setBusy(true);
    try {
      const result = await continueWithEmail(email, password);
      if (result.ok) {
        message.success(successMessage);
        await redirectAfterAuth();
        return;
      }
      if (result.info) {
        message.info(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || user) {
    return (
      <PastelShell fixed showLogin={false} backHref="/" backLabel="←">
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Spin size="large" />
        </div>
      </PastelShell>
    );
  }

  return (
    <PastelShell fixed showLogin={false} backHref="/" backLabel="←">
      <div className={styles.wrap}>
        <div className={styles.leftCol}>
          <div className={styles.hero}>
            <p className={`${landingStyles.valuePrimary} ${styles.heroBadge}`}>{badge}</p>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroLine}>{titleLine1}</span>
              <span className={styles.heroLine}>{titleLine2}</span>
            </h1>
          </div>

          <div className={styles.benefits}>
            {benefits.map((benefit) => (
              <article key={benefit.title} className={styles.benefitCard}>
                <span className={`${styles.iconWrap} ${benefit.iconClass}`} aria-hidden>
                  {benefit.icon}
                </span>
                <p className={styles.benefitTitle}>{benefit.title}</p>
                <p className={styles.benefitDesc}>{benefit.desc}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.authPanel}>
          <button type="button" className={styles.googleBtn} disabled={busy} onClick={() => void handleGoogle()}>
            <GoogleIcon />
            Continuar com Google
          </button>

          <div className={styles.divider}>ou</div>

          <form className={styles.emailForm} onSubmit={(e) => void handleEmailSubmit(e)}>
            <input
              className={styles.input}
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Senha (mín. 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={email ? "current-password" : "new-password"}
              disabled={busy}
              minLength={6}
            />
            <button
              type="submit"
              className={`${styles.continueBtn} ${variant === "tutor" ? styles.continueBtnWarm : ""}`}
              disabled={busy || !email.trim() || password.length < 6}
            >
              {busy ? "Aguarde…" : "Continuar com e-mail"}
            </button>
          </form>
        </div>
      </div>
    </PastelShell>
  );
}

export { styles as pastelAuthStyles };
