"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Space, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ProfileForm = {
  full_name?: string;
  phone?: string;
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
  // Cast para never devido ao bug de inferência do supabase-js com TS 5.
  const { error } = await supabaseClient
    .from("profiles")
    .upsert(
      {
        id,
        full_name: payload.full_name ?? null,
        phone: payload.phone ?? null,
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

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        full_name: data.full_name ?? undefined,
        phone: data.phone ?? undefined,
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: ProfileForm) => upsertProfile(user!.id, values),
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
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card loading={isLoading} title="Dados da conta">
        <Typography.Paragraph>
          <strong>E-mail:</strong> {user.email}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>ID do usuário:</strong> {user.id}
        </Typography.Paragraph>
      </Card>

      <Card title="Perfil">
        <Form<ProfileForm> layout="vertical" form={form} onFinish={(values) => mutation.mutate(values)}>
          <Form.Item label="Nome completo" name="full_name">
            <Input placeholder="Seu nome" />
          </Form.Item>
          <Form.Item label="Telefone" name="phone">
            <Input placeholder="(00) 00000-0000" />
          </Form.Item>
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

