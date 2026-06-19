"use client";

import type { ChangeEvent } from "react";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Switch } from "antd";

import { formatCpf, isValidCpfLength, normalizeCpf } from "@/lib/cpf";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

import styles from "./profile-panel.module.css";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileForm = {
  full_name?: string;
  phone?: string;
  cpf?: string;
  cpf_share_enabled?: boolean;
};

type ProfilePanelProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const { user, signOut } = useAuth();
  const [form] = Form.useForm<ProfileForm>();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data: row, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle<Profile>();
      if (error) throw error;
      return row;
    },
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        full_name: data.full_name ?? undefined,
        phone: data.phone ?? undefined,
        cpf: data.cpf ? formatCpf(data.cpf) : undefined,
        cpf_share_enabled: data.cpf_share_enabled,
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      if (values.cpf && !isValidCpfLength(values.cpf)) throw new Error("CPF deve ter 11 dígitos.");
      const cpf = values.cpf ? normalizeCpf(values.cpf) : null;
      const { error } = await supabaseClient.from("profiles").upsert(
        {
          id: user!.id,
          full_name: values.full_name ?? null,
          phone: values.phone ?? null,
          cpf: cpf && cpf.length === 11 ? cpf : null,
          cpf_share_enabled: values.cpf_share_enabled ?? false,
        } as never,
        { onConflict: "id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Perfil salvo.");
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (!open || !user) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.panel} role="dialog" aria-label="Perfil" onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <span className={styles.avatar}>👤</span>
          <div>
            <h2>Seu perfil</h2>
            <p>{user.email}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <Form<ProfileForm> form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)} className={styles.form}>
          <Form.Item label="Nome" name="full_name">
            <Input placeholder="Como te chamamos?" disabled={isLoading} />
          </Form.Item>
          <Form.Item label="Telefone" name="phone">
            <Input placeholder="(00) 00000-0000" />
          </Form.Item>
          <Form.Item label="CPF" name="cpf">
            <Input
              placeholder="000.000.000-00"
              maxLength={14}
              onChange={(e: ChangeEvent<HTMLInputElement>) => form.setFieldValue("cpf", formatCpf(e.target.value))}
            />
          </Form.Item>
          <Form.Item label="Clínicas me encontram pelo CPF" name="cpf_share_enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block>
            Salvar
          </Button>
        </Form>
        <button type="button" className={styles.logoutBtn} onClick={() => signOut()}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}
