"use client";

import type { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type TreatmentKind = Database["public"]["Enums"]["treatment_kind"];
type TreatmentStatus = Database["public"]["Enums"]["treatment_status"];
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

type PetOption = Pick<Database["public"]["Tables"]["pets"]["Row"], "id" | "name">;

const fetchPets = async () => {
  const { data, error } = await supabaseClient.from("pets").select("id,name").order("name");
  if (error) throw error;
  return (data ?? []) as PetOption[];
};

export default function TreatmentCreatePage() {
  const router = useRouter();
  const [form] = Form.useForm<TreatmentFormValues>();
  const { message } = App.useApp();

  const { data: pets, isLoading: loadingPets } = useQuery({
    queryKey: ["pets-options"],
    queryFn: fetchPets,
  });

  const handleSubmit = async (values: TreatmentFormValues) => {
    const payload = {
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

    // Cast necessário devido à inferência `never` do supabase-js com React 19.
    const { error } = await supabaseClient.from("pet_treatments").insert(payload as never);
    if (error) {
      message.error(error.message);
      return;
    }

    message.success("Cuidado cadastrado com sucesso!");
    router.push("/treatments");
  };

  const petOptions = (pets ?? []).map((pet) => ({ label: pet.name, value: pet.id }));

  return (
    <Card
      title="Cadastrar cuidado"
      extra={
        <Button onClick={() => router.back()} type="default">
          Voltar
        </Button>
      }
    >
      <Form<TreatmentFormValues>
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        initialValues={{
          status: "scheduled",
          kind: "general_medication",
        }}
      >
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
          <Form.Item
            label="Status"
            name="status"
            style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <Select options={statusOptions} />
          </Form.Item>
        </Space>

        <Form.Item label="Descrição" name="description">
          <Input.TextArea rows={3} placeholder="Detalhes do cuidado, fabricante, dose, etc." />
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
            Salvar
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

