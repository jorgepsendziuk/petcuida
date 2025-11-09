"use client";

import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Space, Table, Tag, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Reminder = Database["public"]["Tables"]["reminders"]["Row"] & {
  pets: { name: string } | null;
  pet_treatments: { title: string } | null;
};

const fetchReminders = async () => {
  const { data, error } = await supabaseClient
    .from("reminders")
    .select("*, pets(name), pet_treatments(title)")
    .order("remind_at", { ascending: true });

  if (error) throw error;
  return data as Reminder[];
};

export default function RemindersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["reminders", user?.id],
    queryFn: fetchReminders,
    enabled: !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: async (reminderId: string) => {
      // Cast necessário por bug de tipos `never` do supabase-js.
      const { error } = await supabaseClient
        .from("reminders")
        .update({ delivered_at: new Date().toISOString() } as never)
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Lembrete marcado como entregue.");
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  return (
    <Card title="Lembretes">
      <Table<Reminder>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
      >
        <Table.Column<Reminder>
          title="Pet"
          render={(_, record) => record.pets?.name ?? "—"}
        />
        <Table.Column<Reminder>
          title="Cuidado"
          render={(_, record) => record.pet_treatments?.title ?? "—"}
        />
        <Table.Column<Reminder>
          title="Mensagem"
          dataIndex="message"
          render={(value: string) => (
            <Typography.Paragraph ellipsis={{ rows: 2, tooltip: value }}>
              {value}
            </Typography.Paragraph>
          )}
        />
        <Table.Column<Reminder>
          title="Data"
          dataIndex="remind_at"
          render={(value: string) => dayjs(value).format("DD/MM/YYYY HH:mm")}
        />
        <Table.Column<Reminder>
          title="Status"
          render={(_, record) =>
            record.delivered_at ? <Tag color="green">Enviado</Tag> : <Tag color="orange">Pendente</Tag>
          }
        />
        <Table.Column<Reminder>
          title="Ações"
          render={(_, record) => (
            <Space>
              <Button
                type="link"
                disabled={Boolean(record.delivered_at)}
                loading={mutation.isPending}
                onClick={() => mutation.mutate(record.id)}
              >
                Marcar como entregue
              </Button>
            </Space>
          )}
        />
      </Table>
    </Card>
  );
}

