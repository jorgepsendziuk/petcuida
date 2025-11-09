"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Switch } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Pet = Database["public"]["Tables"]["pets"]["Row"];

type PetFormValues = {
  name: string;
  species: Pet["species"];
  sex: Pet["sex"];
  breed?: string;
  color?: string;
  microchip_id?: string;
  weight_kg?: number;
  birthdate?: Dayjs | null;
  birthdate_estimated: boolean;
  notes?: string;
};

const speciesOptions: { label: string; value: Pet["species"] }[] = [
  { label: "Cachorro", value: "dog" },
  { label: "Gato", value: "cat" },
  { label: "Ave", value: "bird" },
  { label: "Pequeno porte", value: "small_pet" },
  { label: "Outro", value: "other" },
];

const sexOptions: { label: string; value: Pet["sex"] }[] = [
  { label: "Fêmea", value: "female" },
  { label: "Macho", value: "male" },
  { label: "Desconhecido", value: "unknown" },
];

const fetchPet = async (id: string) => {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("*")
    .eq("id", id)
    .maybeSingle<Database["public"]["Tables"]["pets"]["Row"]>();
  if (error) throw error;
  if (!data) throw new Error("Pet não encontrado");
  return data;
};

export default function PetEditPage() {
  const params = useParams<{ id: string }>();
  const petId = params.id;
  const router = useRouter();
  const [form] = Form.useForm<PetFormValues>();
  const { message } = App.useApp();

  useEffect(() => {
    if (!petId) return;

    fetchPet(petId)
      .then((pet) => {
        form.setFieldsValue({
          name: pet.name,
          species: pet.species,
          sex: pet.sex,
          breed: pet.breed ?? undefined,
          color: pet.color ?? undefined,
          microchip_id: pet.microchip_id ?? undefined,
          weight_kg: pet.weight_kg ?? undefined,
          birthdate: pet.birthdate ? dayjs(pet.birthdate) : null,
          birthdate_estimated: pet.birthdate_estimated,
          notes: pet.notes ?? undefined,
        });
      })
      .catch((error) => {
        message.error(error.message);
        router.replace("/pets");
      });
  }, [form, message, petId, router]);

  const handleSubmit = async (values: PetFormValues) => {
    if (!petId) return;

    const payload: Database["public"]["Tables"]["pets"]["Update"] = {
      name: values.name,
      species: values.species,
      sex: values.sex,
      breed: values.breed ?? null,
      color: values.color ?? null,
      microchip_id: values.microchip_id ?? null,
      weight_kg: values.weight_kg ?? null,
      birthdate: values.birthdate ? values.birthdate.format("YYYY-MM-DD") : null,
      birthdate_estimated: values.birthdate_estimated,
      notes: values.notes ?? null,
    };

    // Tipagem de update do supabase falha com React 19 + TS 5; cast garante build mantendo validação no payload acima.
    const { error } = await supabaseClient
      .from("pets")
      .update(payload as never)
      .eq("id", petId);
    if (error) {
      message.error(error.message);
      return;
    }

    message.success("Pet atualizado com sucesso!");
    router.push(`/pets/${petId}`);
  };

  return (
    <Card
      title="Editar pet"
      extra={
        <Button onClick={() => router.back()} type="default">
          Voltar
        </Button>
      }
    >
      <Form<PetFormValues> layout="vertical" form={form} onFinish={handleSubmit}>
        <Form.Item label="Nome" name="name" rules={[{ required: true, message: "Informe o nome" }]}>
          <Input placeholder="Nome do pet" />
        </Form.Item>

        <Space size="large" style={{ width: "100%" }} wrap>
          <Form.Item
            label="Espécie"
            name="species"
            style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <Select options={speciesOptions} />
          </Form.Item>
          <Form.Item label="Sexo" name="sex" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Select options={sexOptions} />
          </Form.Item>
        </Space>

        <Space size="large" style={{ width: "100%" }} wrap>
          <Form.Item label="Raça" name="breed" style={{ flex: 1 }}>
            <Input placeholder="Raça (opcional)" />
          </Form.Item>
          <Form.Item label="Cor" name="color" style={{ flex: 1 }}>
            <Input placeholder="Cor (opcional)" />
          </Form.Item>
        </Space>

        <Space size="large" style={{ width: "100%" }} wrap>
          <Form.Item label="Microchip" name="microchip_id" style={{ flex: 1 }}>
            <Input placeholder="Código do microchip" />
          </Form.Item>
          <Form.Item label="Peso (kg)" name="weight_kg" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.1} placeholder="Ex: 12.5" style={{ width: "100%" }} />
          </Form.Item>
        </Space>

        <Space size="large" style={{ width: "100%" }} wrap>
          <Form.Item label="Data de nascimento" name="birthdate" style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            label="Data estimada?"
            name="birthdate_estimated"
            valuePropName="checked"
            style={{ flex: 1 }}
          >
            <Switch />
          </Form.Item>
        </Space>

        <Form.Item label="Observações" name="notes">
          <Input.TextArea rows={4} placeholder="Informações adicionais, alergias, etc." />
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

