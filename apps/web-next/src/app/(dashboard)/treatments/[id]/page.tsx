"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, DatePicker, Descriptions, Form, Input, List, Select, Space, Tag, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Treatment = Database["public"]["Tables"]["pet_treatments"]["Row"] & {
  pets: { name: string } | null;
};
type TreatmentLog = Database["public"]["Tables"]["pet_treatment_logs"]["Row"];
type TreatmentStatus = Database["public"]["Enums"]["treatment_status"];

type LogFormValues = {
  administered_at: dayjs.Dayjs;
  status: TreatmentStatus;
  dosage?: string;
  batch_number?: string;
  administered_by?: string;
  notes?: string;
};

const statusOptions: { label: string; value: TreatmentStatus }[] = [
  { label: "Agendado", value: "scheduled" },
  { label: "Concluído", value: "completed" },
  { label: "Perdido", value: "missed" },
  { label: "Cancelado", value: "cancelled" },
];

const fetchTreatmentDetails = async (id: string) => {
  const [treatmentResponse, logsResponse] = await Promise.all([
    supabaseClient
      .from("pet_treatments")
      .select("*, pets(name)")
      .eq("id", id)
      .maybeSingle(),
    supabaseClient
      .from("pet_treatment_logs")
      .select("*")
      .eq("pet_treatment_id", id)
      .order("administered_at", { ascending: false }),
  ]);

  if (treatmentResponse.error) throw treatmentResponse.error;
  if (!treatmentResponse.data) throw new Error("Cuidado não encontrado");
  if (logsResponse.error) throw logsResponse.error;

  return {
    treatment: treatmentResponse.data as Treatment,
    logs: logsResponse.data ?? [],
  };
};

export default function TreatmentDetailsPage() {
  const params = useParams<{ id: string }>();
  const treatmentId = params.id;
  const queryClient = useQueryClient();
  const [form] = Form.useForm<LogFormValues>();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["treatment-details", treatmentId],
    queryFn: () => fetchTreatmentDetails(treatmentId),
    enabled: Boolean(treatmentId),
  });

  const mutation = useMutation({
    mutationFn: async (values: LogFormValues) => {
      const payload = {
        p_pet_treatment_id: treatmentId,
        p_administered_at: values.administered_at.toISOString(),
        p_status: values.status,
        p_dosage: values.dosage ?? null,
        p_batch_number: values.batch_number ?? null,
        p_administered_by: values.administered_by ?? null,
        p_notes: values.notes ?? null,
      };

      // `rpc` também sofre com inferência `never` em supabase-js + TS 5.
      const { error } = await supabaseClient.rpc("log_pet_treatment", payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Registro adicionado com sucesso!");
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["treatment-details", treatmentId] });
      void queryClient.invalidateQueries({ queryKey: ["treatments"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const kindLabel = useMemo(
    () => ({
      vaccine: "Vacina",
      deworming: "Vermífugo",
      tick_flea: "Carrapato/Pulga",
      general_medication: "Medicação",
      checkup: "Check-up",
    }),
    [],
  );

  if (!treatmentId) {
    return <Typography.Text>Tratamento inválido.</Typography.Text>;
  }

  const treatment = data?.treatment;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title={treatment ? `Cuidado • ${treatment.title}` : "Cuidado"}
        loading={isLoading}
        extra={<Link href={`/treatments/${treatmentId}/edit`}>Editar</Link>}
      >
        {treatment && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Pet" span={2}>
              {treatment.pets ? (
                <Link href={`/pets/${treatment.pet_id}`}>
                  <Typography.Link>{treatment.pets.name}</Typography.Link>
                </Link>
              ) : (
                "—"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Tipo">
              <Tag color="geekblue">{kindLabel[treatment.kind]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color="processing">{treatment.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Início">
              {treatment.start_date ? dayjs(treatment.start_date).format("DD/MM/YYYY") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Próximo vencimento">
              {treatment.next_due_at
                ? dayjs(treatment.next_due_at).format("DD/MM/YYYY")
                : treatment.due_date
                  ? dayjs(treatment.due_date).format("DD/MM/YYYY")
                  : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Frequência (dias)">
              {treatment.frequency_days ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Descrição" span={2}>
              {treatment.description ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Observações" span={2}>
              {treatment.notes ?? "—"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="Registrar administração">
        <Form<LogFormValues>
          layout="vertical"
          form={form}
          initialValues={{ status: "completed", administered_at: dayjs() }}
          onFinish={(values) => mutation.mutate(values)}
        >
          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item
              label="Data"
              name="administered_at"
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item label="Status" name="status" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select options={statusOptions} />
            </Form.Item>
          </Space>

          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item label="Dosagem" name="dosage" style={{ flex: 1 }}>
              <Input placeholder="Ex: 2 ml" />
            </Form.Item>
            <Form.Item label="Lote" name="batch_number" style={{ flex: 1 }}>
              <Input placeholder="Código do lote" />
            </Form.Item>
          </Space>

          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item label="Aplicado por" name="administered_by" style={{ flex: 1 }}>
              <Input placeholder="Nome do responsável" />
            </Form.Item>
            <Form.Item label="Observações" name="notes" style={{ flex: 1 }}>
              <Input.TextArea rows={1} placeholder="Observações" />
            </Form.Item>
          </Space>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Registrar
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Histórico de aplicações" loading={isLoading}>
        <List<TreatmentLog>
          dataSource={data?.logs ?? []}
          locale={{ emptyText: "Nenhum registro ainda." }}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color="processing">{item.status}</Tag>
                    <Typography.Text strong>
                      {dayjs(item.administered_at).format("DD/MM/YYYY HH:mm")}
                    </Typography.Text>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2}>
                    {item.dosage ? <Typography.Text>Dosagem: {item.dosage}</Typography.Text> : null}
                    {item.batch_number ? (
                      <Typography.Text>Lote: {item.batch_number}</Typography.Text>
                    ) : null}
                    {item.administered_by ? (
                      <Typography.Text>Aplicado por: {item.administered_by}</Typography.Text>
                    ) : null}
                    {item.notes ? (
                      <Typography.Text type="secondary">{item.notes}</Typography.Text>
                    ) : null}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}

