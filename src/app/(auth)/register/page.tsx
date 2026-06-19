"use client";

import type { ChangeEvent } from "react";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { App, Button, Input, Spin } from "antd";

import { PartnerAuthPage } from "@/components/auth/partner-auth-page";
import { AnimalBackground } from "@/components/ui/animal-background";
import { StepShell, stepStyles } from "@/components/wizard/step-shell";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { BRAND_NAME } from "@/lib/brand";

import styles from "./register.module.css";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <Spin size="large" />
        </div>
      }
    >
      <RegisterWizard />
    </Suspense>
  );
}

function RegisterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isParceiro = searchParams.get("tipo") === "parceiro";
  const nextParam = searchParams.get("next");
  const { signUp, isLoading } = useAuth();
  const { message } = App.useApp();

  const [step, setStep] = useState(0);
  const [authMode, setAuthMode] = useState<"social" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  if (isParceiro) {
    return <PartnerAuthPage />;
  }

  const afterAuthPath = nextParam?.startsWith("/") ? nextParam : "/dashboard";
  const loginNext = encodeURIComponent(afterAuthPath);
  const totalSteps = 3;

  const handleSocial = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${afterAuthPath}`,
      },
    });
    if (error) message.error(error.message);
  };

  const handleEmailContinue = async () => {
    if (!email || password.length < 6) {
      message.warning("Informe e-mail válido e senha com pelo menos 6 caracteres.");
      return;
    }
    try {
      await signUp({ email, password, fullName: fullName || undefined });
      message.success("Conta criada! Confira seu e-mail se necessário.");
      router.replace(`/login?next=${loginNext}`);
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const page = (
    <div className={styles.page}>
      <AnimalBackground />
      <div className={styles.inner}>
        {step === 0 && (
          <StepShell
            step={0}
            totalSteps={totalSteps}
            emoji="🐾"
            title="Criar conta"
            subtitle="Entre em segundos. O resto você completa depois, se quiser."
            actions={
              <>
                <Button
                  block
                  icon={<GoogleOutlined />}
                  className={stepStyles.socialBtn}
                  onClick={() => void handleSocial()}
                >
                  Continuar com Google
                </Button>
                <Button
                  block
                  className={stepStyles.secondaryBtn}
                  icon={<MailOutlined />}
                  onClick={() => {
                    setAuthMode("email");
                    setStep(1);
                  }}
                >
                  Continuar com e-mail
                </Button>
                <Link href="/login" className={styles.loginLink}>
                  Já tenho conta — entrar
                </Link>
              </>
            }
          >
            <ul className={stepStyles.benefitList}>
              <li className={stepStyles.benefitItem}>
                <span className={stepStyles.benefitIcon}>⚡</span>
                <span>Sem formulário longo — você vê o app logo</span>
              </li>
            </ul>
          </StepShell>
        )}

        {step === 1 && authMode === "email" && (
          <StepShell
            step={1}
            totalSteps={totalSteps}
            emoji="✉️"
            title="Seu e-mail"
            subtitle="Só isso para criar a conta."
            actions={
              <>
                <Button
                  type="primary"
                  block
                  className={stepStyles.primaryBtn}
                  loading={isLoading}
                  disabled={!email || password.length < 6}
                  onClick={() => setStep(2)}
                >
                  Continuar
                </Button>
                <Button type="text" block className={stepStyles.skipBtn} onClick={() => setStep(0)}>
                  Voltar
                </Button>
              </>
            }
          >
            <Input
              className={stepStyles.bigInput}
              placeholder="seu@email.com"
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              autoFocus
            />
            <Input.Password
              className={stepStyles.bigInput}
              placeholder="Senha (mín. 6)"
              prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </StepShell>
        )}

        {step === 2 && authMode === "email" && (
          <StepShell
            step={2}
            totalSteps={totalSteps}
            emoji="👋"
            title="Como te chamamos?"
            subtitle="Opcional — pode pular."
            actions={
              <>
                <Button
                  type="primary"
                  block
                  className={stepStyles.primaryBtn}
                  loading={isLoading}
                  onClick={() => void handleEmailContinue()}
                >
                  {`Entrar no ${BRAND_NAME}`}
                </Button>
                <Button
                  block
                  className={stepStyles.secondaryBtn}
                  loading={isLoading}
                  onClick={() => {
                    setFullName("");
                    void handleEmailContinue();
                  }}
                >
                  Pular e entrar
                </Button>
              </>
            }
          >
            <Input
              className={stepStyles.bigInput}
              placeholder="Seu nome"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              autoFocus
            />
          </StepShell>
        )}
      </div>
    </div>
  );

  return page;
}
