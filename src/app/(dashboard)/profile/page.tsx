"use client";

import type { ChangeEvent } from "react";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Space, Switch, Typography } from "antd";

import { formatCpf, isValidCpfLength, normalizeCpf } from "@/lib/cpf";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ProfileForm = {
  full_name?: string;
  phone?: string;
  cpf?: string;
  cpf_share_enabled?: boolean;
};

const fetchProfile = async (id: string) => {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (error) throw error;
  return data ?? null;
};

const upsertProfile = async (id: string, payload: ProfileForm) => {
  const cpf = payload.cpf ? normalizeCpf(payload.cpf) : null;
  const { error } = await supabaseClient.from("profiles").upsert(
    {
      id,
      full_name: payload.full_name ?? null,
      phone: payload.phone ?? null,
      cpf: cpf && cpf.length === 11 ? cpf : null,
      cpf_share_enabled: payload.cpf_share_enabled ?? false,
    } as never,
    { onConflict: "id" },
  );
  if (error) throw error;
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [form] = Form.useForm<ProfileForm>();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
  });

  const cpfShareEnabled = Form.useWatch("cpf_share_enabled", form);

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
    mutationFn: (values: ProfileForm) => {
      if (values.cpf && !isValidCpfLength(values.cpf)) {
        throw new Error("CPF deve ter 11 dígitos.");
      }
      return upsertProfile(user!.id, values);
    },
    onSuccess: () => {
      message.success("Perfil atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  if (!user) {
    return <Typography.Text>Carregando perfil...</Typography.Text>;
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card loading={isLoading} title="Dados da conta">
        <Typography.Paragraph>
          <strong>E-mail:</strong> {user.email}
        </Typography.Paragraph>
      </Card>

      <Card title="Perfil">
        <Form<ProfileForm> layout="vertical" form={form} onFinish={(values: ProfileForm) => mutation.mutate(values)}>
          <Form.Item label="Nome completo" name="full_name">
            <Input placeholder="Seu nome" />
          </Form.Item>
          <Form.Item label="Telefone" name="phone">
            <Input placeholder="(00) 00000-0000" />
          </Form.Item>
          <Form.Item
            label="CPF (opcional)"
            name="cpf"
            extra="Se informar o CPF, você pode permitir que clínicas encontrem seus pets para pedir acesso."
          >
            <Input placeholder="000.000.000-00" maxLength={14} onChange={(e: ChangeEvent<HTMLInputElement>) => form.setFieldValue("cpf", formatCpf(e.target.value))} />
          </Form.Item>
          <Form.Item
            label="Permitir que clínicas me encontrem pelo CPF"
            name="cpf_share_enabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {cpfShareEnabled && (
            <Typography.Paragraph type="secondary">
              LGPD-PET: cada clínica precisa da sua aprovação por pet. Você pode revogar a qualquer momento.
            </Typography.Paragraph>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Salvar alterações
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Button danger onClick={() => signOut()}>
          Sair da conta
        </Button>
      </Card>
    </Space>
  );
}
