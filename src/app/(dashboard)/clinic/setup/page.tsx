"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";

import authStyles from "@/components/auth/pastel-auth.module.css";
import { PastelShell } from "@/components/landing/pastel-shell";
import { PastelWizardShell, pastelWizardStyles as wizardStyles } from "@/components/wizard/pastel-wizard-shell";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { slugify } from "@/lib/clinic/slug";
import { fetchCnpjFromBrasilApi, formatCnpj, isValidCnpjLength, normalizeCnpj } from "@/lib/cnpj";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

const SETUP_BENEFITS = [
  {
    icon: "📋",
    iconClass: wizardStyles.benefitIconTeal,
    title: "CNPJ automático",
    desc: "Razão social e endereço na hora",
  },
  {
    icon: "🔍",
    iconClass: wizardStyles.benefitIconViolet,
    title: "Tutores te acham",
    desc: "Sua clínica no catálogo",
  },
  {
    icon: "🔒",
    iconClass: wizardStyles.benefitIconOrange,
    title: "Só com ok",
    desc: "Acesso à ficha com permissão",
  },
  {
    icon: "💚",
    iconClass: wizardStyles.benefitIconPink,
    title: "Grátis sempre",
    desc: "Sem mensalidade",
  },
] as const;

export default function ClinicSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: membership, isLoading } = useClinicMembership();

  const [step, setStep] = useState(0);
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);

  const totalSteps = 3;

  const lookupCnpj = async () => {
    if (!isValidCnpjLength(cnpj)) {
      message.warning("Informe um CNPJ com 14 dígitos ou pule esta etapa.");
      return;
    }
    setCnpjLoading(true);
    try {
      const data = await fetchCnpjFromBrasilApi(cnpj);
      setName(data.nome_fantasia || data.razao_social || name);
      setDescription(data.razao_social ? `Razão social: ${data.razao_social}` : description);
      setAddressLine([data.logradouro, data.numero].filter(Boolean).join(", "));
      setCity(data.municipio || city);
      setState(data.uf || state);
      setZipCode(data.cep?.replace(/\D/g, "") || zipCode);
      setPhone(data.ddd_telefone_1 || phone);
      message.success("Dados preenchidos automaticamente!");
      setStep(2);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setCnpjLoading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome da clínica.");
      const slug = slugify(name);
      const cnpjDigits = cnpj ? normalizeCnpj(cnpj) : null;

      const { data: clinic, error: clinicError } = await supabaseClient
        .from("clinics")
        .insert({
          name: name.trim(),
          slug,
          cnpj: cnpjDigits,
          description: description || null,
          phone: phone || null,
          email: user?.email ?? null,
          city: city || null,
          state: state || null,
          address_line: addressLine || null,
          zip_code: zipCode || null,
          is_public: true,
        } as never)
        .select("id")
        .single();

      if (clinicError) throw clinicError;

      const { error: memberError } = await supabaseClient.from("clinic_members").insert({
        clinic_id: (clinic as { id: string }).id,
        user_id: user!.id,
        role: "owner",
      } as never);
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      message.success("Clínica cadastrada!");
      router.push("/clinic");
    },
    onError: (error: Error) => message.error(error.message),
  });

  const shell = (content: ReactNode) => (
    <PastelShell fixed showLogin={false} backHref="/" backLabel="←">
      {content}
    </PastelShell>
  );

  if (isLoading) {
    return shell(
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>,
    );
  }

  if (membership) {
    return shell(
      <PastelWizardShell
        step={2}
        totalSteps={totalSteps}
        emoji="✅"
        title={membership.clinic.name}
        subtitle="Você já tem uma clínica vinculada."
        actions={
          <button type="button" className={wizardStyles.primaryBtn} onClick={() => router.push("/clinic")}>
            Ir para área da clínica
          </button>
        }
      >
        <p className={wizardStyles.hint}>Busque tutores por CPF e peça acesso às fichas dos pets.</p>
      </PastelWizardShell>,
    );
  }

  if (step === 0) {
    return shell(
      <PastelWizardShell
        step={0}
        totalSteps={totalSteps}
        emoji="🏥"
        title="Cadastre sua clínica"
        subtitle="Rápido — CNPJ é opcional."
        actions={
          <button type="button" className={wizardStyles.primaryBtn} onClick={() => setStep(1)}>
            Continuar
          </button>
        }
      >
        <div className={wizardStyles.benefitGrid}>
          {SETUP_BENEFITS.map((benefit) => (
            <article key={benefit.title} className={wizardStyles.benefitCard}>
              <span className={`${wizardStyles.benefitIcon} ${benefit.iconClass}`} aria-hidden>
                {benefit.icon}
              </span>
              <p className={wizardStyles.benefitTitle}>{benefit.title}</p>
              <p className={wizardStyles.benefitDesc}>{benefit.desc}</p>
            </article>
          ))}
        </div>
      </PastelWizardShell>,
    );
  }

  if (step === 1) {
    return shell(
      <PastelWizardShell
        step={1}
        totalSteps={totalSteps}
        emoji="🏢"
        title="CNPJ da clínica"
        subtitle="Opcional — buscamos os dados na Receita Federal."
        actions={
          <>
            <button
              type="button"
              className={wizardStyles.primaryBtn}
              disabled={cnpjLoading}
              onClick={() => void lookupCnpj()}
            >
              <SearchOutlined />
              {cnpjLoading ? "Buscando…" : "Buscar CNPJ"}
            </button>
            <button type="button" className={wizardStyles.secondaryBtn} onClick={() => setStep(2)}>
              Pular — cadastrar manualmente
            </button>
          </>
        }
      >
        <input
          className={authStyles.input}
          placeholder="00.000.000/0000-00"
          maxLength={18}
          value={cnpj}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCnpj(formatCnpj(e.target.value))}
          autoFocus
        />
      </PastelWizardShell>,
    );
  }

  return shell(
    <PastelWizardShell
      step={2}
      totalSteps={totalSteps}
      emoji="✨"
      title="Nome da clínica"
      subtitle="Último passo — o resto você completa depois."
      actions={
        <>
          <button
            type="button"
            className={wizardStyles.primaryBtn}
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando…" : "Cadastrar clínica"}
          </button>
          <button
            type="button"
            className={wizardStyles.secondaryBtn}
            disabled={!name.trim() || mutation.isPending}
            onClick={() => {
              setCity("");
              setPhone("");
              mutation.mutate();
            }}
          >
            Só o nome por agora
          </button>
        </>
      }
    >
      <input
        className={authStyles.input}
        placeholder="Ex: Clínica Veterinária da Maria"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        autoFocus
      />
      {!cnpj && (
        <>
          <input
            className={authStyles.input}
            placeholder="Cidade (opcional)"
            value={city}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
          />
          <input
            className={authStyles.input}
            placeholder="Telefone (opcional)"
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          />
        </>
      )}
    </PastelWizardShell>,
  );
}
