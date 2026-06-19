"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";

import ui from "@/components/clinic/clinic-ui.module.css";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { supabaseClient } from "@/lib/supabase/client";

export default function ClinicSettingsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: membership, isLoading } = useClinicMembership();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [staffEmail, setStaffEmail] = useState("");

  useEffect(() => {
    if (!membership?.clinic) return;
    const c = membership.clinic;
    setName(c.name);
    setPhone(c.phone ?? "");
    setCity(c.city ?? "");
    setDescription(c.description ?? "");
    setAddressLine(c.address_line ?? "");
    setIsPublic(c.is_public);
  }, [membership?.clinic]);

  const { data: members } = useQuery({
    queryKey: ["clinic-members", membership?.clinic_id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("clinic_members")
        .select("id, role, profiles(full_name)")
        .eq("clinic_id", membership!.clinic_id);
      if (error) throw error;
      return data as { id: string; role: string; profiles: { full_name: string | null } | null }[];
    },
    enabled: !!membership?.clinic_id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseClient
        .from("clinics")
        .update({
          name: name.trim(),
          phone: phone || null,
          city: city || null,
          description: description || null,
          address_line: addressLine || null,
          is_public: isPublic,
        } as never)
        .eq("id", membership!.clinic_id);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Clínica atualizada!");
      void queryClient.invalidateQueries({ queryKey: ["clinic-membership"] });
      void queryClient.invalidateQueries({ queryKey: ["partner-hub"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const addStaffMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabaseClient.rpc("find_profile_by_email", {
        p_email: staffEmail.trim(),
      } as never);
      if (error) throw error;
      const row = (data as { user_id: string; full_name: string | null }[] | null)?.[0];
      if (!row) throw new Error("Nenhuma conta com este e-mail.");

      const { error: insertError } = await supabaseClient.from("clinic_members").insert({
        clinic_id: membership!.clinic_id,
        user_id: row.user_id,
        role: "staff",
      } as never);
      if (insertError) throw insertError;
      return row.full_name;
    },
    onSuccess: (fullName) => {
      message.success(`${fullName ?? "Pessoa"} adicionada à equipe!`);
      setStaffEmail("");
      void queryClient.invalidateQueries({ queryKey: ["clinic-members"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (isLoading) {
    return <div className={ui.empty}><Spin /></div>;
  }

  if (!membership) {
    return (
      <div className={ui.page}>
        <div className={ui.empty}>Cadastre sua clínica primeiro.</div>
        <button type="button" className={`${ui.btnPrimary} ${ui.btnBlock}`} onClick={() => router.push("/clinic/setup")}>
          Cadastrar
        </button>
      </div>
    );
  }

  const isOwner = membership.role === "owner";

  return (
    <div className={ui.page}>
      <section className={ui.hero}>
        <Link href="/clinic" className={ui.btnGhost}>← Início</Link>
        <span className={ui.badge}>{membership.clinic.name}</span>
        <h1 className={ui.title}>Sua clínica</h1>
        <p className={ui.subtitle}>Perfil no catálogo e equipe.</p>
      </section>

      <section>
        <span className={ui.sectionLabel}>Dados públicos</span>
        <div className={`${ui.card} ${ui.formStack}`}>
          <div>
            <label className={ui.formLabel}>Nome</label>
            <input className={ui.field} value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} />
          </div>
          <div>
            <label className={ui.formLabel}>Telefone</label>
            <input className={ui.field} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isOwner} />
          </div>
          <div>
            <label className={ui.formLabel}>Cidade</label>
            <input className={ui.field} value={city} onChange={(e) => setCity(e.target.value)} disabled={!isOwner} />
          </div>
          <div>
            <label className={ui.formLabel}>Endereço</label>
            <input className={ui.field} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} disabled={!isOwner} />
          </div>
          <div>
            <label className={ui.formLabel}>Descrição</label>
            <textarea className={`${ui.field} ${ui.fieldArea}`} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isOwner} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#64748b" }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} disabled={!isOwner} />
            Aparecer no catálogo de parceiros
          </label>
          {isOwner && (
            <button type="button" className={`${ui.btnPrimary} ${ui.btnBlock}`} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Salvar alterações
            </button>
          )}
        </div>
      </section>

      <section>
        <span className={ui.sectionLabel}>Equipe</span>
        <div className={ui.cardList}>
          {(members ?? []).map((m) => (
            <article key={m.id} className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h3 className={ui.cardTitle}>{m.profiles?.full_name ?? "Sem nome"}</h3>
                  <p className={ui.cardMeta}>{m.role === "owner" ? "Responsável" : "Equipe"}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        {isOwner && (
          <div className={`${ui.card} ${ui.formStack}`} style={{ marginTop: 12 }}>
            <div>
              <label className={ui.formLabel}>Convidar por e-mail</label>
              <input
                type="email"
                className={ui.field}
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <button
              type="button"
              className={`${ui.btnSecondary} ${ui.btnBlock}`}
              disabled={!staffEmail.trim() || addStaffMutation.isPending}
              onClick={() => addStaffMutation.mutate()}
            >
              Adicionar à equipe
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
