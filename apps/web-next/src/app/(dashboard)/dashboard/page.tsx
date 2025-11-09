"use client";

import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Table, Tag, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type CareStatusRow = Database["public"]["Tables"]["vw_pet_care_status"]["Row"];

const { Title, Text } = Typography;

const fetchDashboardData = async () => {
  const [
    { count: petsCount, error: petsError },
    { count: treatmentsCount, error: treatmentsError },
    { data: nextReminderData, error: nextReminderError },
    { data: careStatusData, error: careStatusError },
  ] = await Promise.all([
    supabaseClient.from("pets").select("id", { count: "exact", head: true }),
    supabaseClient
      .from("pet_treatments")
      .select("id", { count: "exact", head: true })
      .neq("status", "completed"),
    supabaseClient
      .from("reminders")
      .select("remind_at")
      .is("delivered_at", null)
      .order("remind_at", { ascending: true })
      .limit(1)
      .maybeSingle<Pick<Database["public"]["Tables"]["reminders"]["Row"], "remind_at">>(),
    supabaseClient
      .from("vw_pet_care_status")
      .select("*")
      .order("next_event_at", { ascending: true })
      .limit(5),
  ]);

  if (petsError) throw petsError;
  if (treatmentsError) throw treatmentsError;
  if (nextReminderError) throw nextReminderError;
  if (careStatusError) throw careStatusError;

  return {
    totalPets: petsCount ?? 0,
    pendingTreatments: treatmentsCount ?? 0,
    nextReminder: nextReminderData?.remind_at ?? null,
    careStatus: careStatusData ?? [],
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: fetchDashboardData,
    enabled: !!user?.id,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Bem-vindo de volta!
        </Title>
        <Text type="secondary">
          Monitore rapidamente os cuidados dos seus pets e mantenha os lembretes em dia.
        </Text>
      </div>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card loading={isLoading}>
            <Statistic title="Pets cadastrados" value={data?.totalPets ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={isLoading}>
            <Statistic title="Cuidados pendentes" value={data?.pendingTreatments ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="Próximo lembrete"
              value={
                data?.nextReminder
                  ? dayjs(data.nextReminder).format("DD/MM/YYYY HH:mm")
                  : "Nenhum agendado"
              }
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Próximos cuidados"
        extra={
          <Text type="secondary">
            Acompanhe os tratamentos e lembretes com maior prioridade para os seus pets.
          </Text>
        }
      >
        <Table<CareStatusRow>
          rowKey={(row) => `${row.pet_id}-${row.title}`}
          loading={isLoading}
          dataSource={data?.careStatus}
          pagination={false}
          locale={{
            emptyText: "Nenhum cuidado agendado no momento.",
          }}
        >
          <Table.Column<CareStatusRow> title="Pet" dataIndex="name" />
          <Table.Column<CareStatusRow> title="Atividade" dataIndex="title" />
          <Table.Column<CareStatusRow>
            title="Tipo"
            render={(_, record) =>
              record.kind ? <Tag color="geekblue">{record.kind}</Tag> : <Tag>lembrete</Tag>
            }
          />
          <Table.Column<CareStatusRow>
            title="Status"
            render={(_, record) =>
              record.status ? <Tag color="processing">{record.status}</Tag> : <Tag>Pendente</Tag>
            }
          />
          <Table.Column<CareStatusRow>
            title="Próxima data"
            render={(_, record) =>
              record.next_event_at
                ? dayjs(record.next_event_at).format("DD/MM/YYYY HH:mm")
                : "—"
            }
          />
        </Table>
      </Card>
    </div>
  );
}

