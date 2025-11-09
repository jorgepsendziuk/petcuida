"use client";

import { useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Treatment = Database["public"]["Tables"]["pet_treatments"]["Row"];
type TreatmentKind = Database["public"]["Enums"]["treatment_kind"];
type TreatmentStatus = Database["public"]["Enums"]["treatment_status"];
type PetOption = Pick<Database["public"]["Tables"]["pets"]["Row"], "id" | "name">;

type TreatmentFormValues = {
  pet_id: string;
  title: string;
  kind: TreatmentKind;
  status: TreatmentStatus;
  description?: string;
  start_date?: Dayjs | null;
  due_date?: Dayjs | null;
  frequency_days?: number;
  notes?: string;
};

const kindOptions: { label: string; value: TreatmentKind }[] = [
  { label: "Vacina", value: "vaccine" },
  { label: "Vermífugo", value: "deworming" },
  { label: "Carrapato/Pulga", value: "tick_flea" },
  { label: "Medicação", value: "general_medication" },
  { label: "Check-up", value: "checkup" },
];

const statusOptions: { label: string; value: TreatmentStatus }[] = [
  { label: "Agendado", value: "scheduled" },
  { label: "Concluído", value: "completed" },
  { label: "Perdido", value: "missed" },
  { label: "Cancelado", value: "cancelled" },
];

const fetchPets = async () => {
  const { data, error } = await supabaseClient.from("pets").select("id,name").order("name");
  if (error) throw error;
  return (data ?? []) as PetOption[];
};

const fetchTreatment = async (id: string) => {
  const { data, error } = await supabaseClient
    .from("pet_treatments")
    .select("*")
    .eq("id", id)
    .maybeSingle<Treatment>();
  if (error) throw error;
  if (!data) throw new Error("Cuidado não encontrado");
  return data;
};

export default function TreatmentEditPage() {
  const params = useParams<{ id: string }>();
  const treatmentId = params.id;
  const router = useRouter();
  const [form] = Form.useForm<TreatmentFormValues>();
  const { message } = App.useApp();

  const { data: pets, isLoading: loadingPets } = useQuery({
    queryKey: ["pets-options"],
    queryFn: fetchPets,
  });

  useEffect(() => {
    if (!treatmentId) return;
    fetchTreatment(treatmentId)
      .then((treatment) => {
        form.setFieldsValue({
          pet_id: treatment.pet_id,
          title: treatment.title,
          kind: treatment.kind,
          status: treatment.status,
          description: treatment.description ?? undefined,
          start_date: treatment.start_date ? dayjs(treatment.start_date) : null,
          due_date: treatment.due_date ? dayjs(treatment.due_date) : null,
          frequency_days: treatment.frequency_days ?? undefined,
          notes: treatment.notes ?? undefined,
        });
      })
      .catch((error) => {
        message.error(error.message);
        router.replace("/treatments");
      });
  }, [form, message, router, treatmentId]);

  const handleSubmit = async (values: TreatmentFormValues) => {
    if (!treatmentId) return;

    const payload: Partial<Treatment> = {
      pet_id: values.pet_id,
      title: values.title,
      kind: values.kind,
      status: values.status,
      description: values.description ?? null,
      start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
      due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
      frequency_days: values.frequency_days ?? null,
      notes: values.notes ?? null,
    };

    // Cast para never por conta da inferência quebrada do supabase-js.
    const { error } = await supabaseClient
      .from("pet_treatments")
      .update(payload as never)
      .eq("id", treatmentId);
    if (error) {
      message.error(error.message);
      return;
    }

    message.success("Cuidado atualizado!");
    router.push(`/treatments/${treatmentId}`);
  };

  const petOptions = (pets ?? []).map((pet) => ({ label: pet.name, value: pet.id }));

  return (
    <Card
      title="Editar cuidado"
      extra={
        <Button onClick={() => router.back()} type="default">
          Voltar
        </Button>
      }
    >
      <Form<TreatmentFormValues> layout="vertical" form={form} onFinish={handleSubmit}>
        <Form.Item
          label="Pet"
          name="pet_id"
          rules={[{ required: true, message: "Selecione o pet" }]}
        >
          <Select
            options={petOptions}
            loading={loadingPets}
            placeholder="Selecione o pet"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item label="Título" name="title" rules={[{ required: true }]}>
          <Input placeholder="Ex: Vacina V10" />
        </Form.Item>

        <Space size="large" style={{ width: "100%" }} wrap>
          <Form.Item label="Tipo" name="kind" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Select options={kindOptions} />
          </Form.Item>
          <Form.Item label="Status" name="status" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Space>

        <Form.Item label="Descrição" name="description">
          <Input.TextArea rows={3} placeholder="Detalhes do cuidado" />
        </Form.Item>

        <Space size="large" style={{ width: "100%" }} wrap>
          <Form.Item label="Data de início" name="start_date" style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Próximo vencimento" name="due_date" style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Space>

        <Form.Item label="Frequência (dias)" name="frequency_days">
          <InputNumber min={0} style={{ width: "100%" }} placeholder="Ex: 30 dias" />
        </Form.Item>

        <Form.Item label="Observações" name="notes">
          <Input.TextArea rows={4} placeholder="Observações adicionais" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Salvar alterações
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

