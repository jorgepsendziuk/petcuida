"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Space, Table, Tag, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Treatment = Database["public"]["Tables"]["pet_treatments"]["Row"] & {
  pets: { name: string } | null;
};

const kindLabel: Record<Database["public"]["Enums"]["treatment_kind"], string> = {
  vaccine: "Vacina",
  deworming: "Vermífugo",
  tick_flea: "Carrapato/Pulga",
  general_medication: "Medicação",
  checkup: "Check-up",
};

const fetchTreatments = async () => {
  const { data, error } = await supabaseClient
    .from("pet_treatments")
    .select("*, pets(name)")
    .order("next_due_at", { ascending: true });

  if (error) throw error;
  return data as Treatment[];
};

export default function TreatmentsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["treatments", user?.id],
    queryFn: fetchTreatments,
    enabled: !!user?.id,
  });

  return (
    <Card
      title="Cuidados cadastrados"
      extra={
        <Button type="primary" onClick={() => router.push("/treatments/create")}>
          Adicionar cuidado
        </Button>
      }
    >
      <Table<Treatment>
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
      >
        <Table.Column<Treatment>
          title="Pet"
          render={(_, record) =>
            record.pets ? (
              <Link href={`/pets/${record.pet_id}`}>
                <Typography.Link>{record.pets.name}</Typography.Link>
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Table.Column<Treatment>
          title="Título"
          dataIndex="title"
          render={(title: string, record) => (
            <Link href={`/treatments/${record.id}`}>
              <Typography.Link>{title}</Typography.Link>
            </Link>
          )}
        />
        <Table.Column<Treatment>
          title="Tipo"
          dataIndex="kind"
          render={(value: Treatment["kind"]) => <Tag color="geekblue">{kindLabel[value]}</Tag>}
        />
        <Table.Column<Treatment>
          title="Status"
          dataIndex="status"
          render={(value: Treatment["status"]) => <Tag color="processing">{value}</Tag>}
        />
        <Table.Column<Treatment>
          title="Próximo vencimento"
          dataIndex="next_due_at"
          render={(value: string | null) =>
            value ? dayjs(value).format("DD/MM/YYYY") : "Não agendado"
          }
        />
        <Table.Column<Treatment>
          title="Frequência (dias)"
          dataIndex="frequency_days"
          render={(value: number | null) => value ?? "—"}
        />
        <Table.Column<Treatment>
          title="Ações"
          render={(_, record) => (
            <Space>
              <Link href={`/treatments/${record.id}`}>Detalhes</Link>
              <Link href={`/treatments/${record.id}/edit`}>Editar</Link>
            </Space>
          )}
        />
      </Table>
    </Card>
  );
}

