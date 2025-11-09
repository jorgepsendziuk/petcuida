"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, Descriptions, List, Space, Tag, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type PetTreatment = Database["public"]["Tables"]["pet_treatments"]["Row"];

const fetchPetDetails = async (id: string) => {
  const [petResponse, treatmentsResponse] = await Promise.all([
    supabaseClient
      .from("pets")
      .select("*")
      .eq("id", id)
      .maybeSingle<Database["public"]["Tables"]["pets"]["Row"]>(),
    supabaseClient
      .from("pet_treatments")
      .select("*")
      .eq("pet_id", id)
      .order("next_due_at", { ascending: true }),
  ]);

  if (petResponse.error) throw petResponse.error;
  if (!petResponse.data) throw new Error("Pet não encontrado");
  if (treatmentsResponse.error) throw treatmentsResponse.error;

  const treatments = (treatmentsResponse.data ?? []) as PetTreatment[];

  return {
    pet: petResponse.data,
    treatments,
  };
};

export default function PetDetailsPage() {
  const params = useParams<{ id: string }>();
  const petId = params.id;

  const { data, isLoading } = useQuery({
    queryKey: ["pet-details", petId],
    queryFn: () => fetchPetDetails(petId),
    enabled: Boolean(petId),
  });

  if (!petId) {
    return <Typography.Text>Pet inválido.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Informações do pet"
        loading={isLoading}
        extra={<Link href={`/pets/${petId}/edit`}>Editar</Link>}
      >
        {data?.pet && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nome">{data.pet.name}</Descriptions.Item>
            <Descriptions.Item label="Espécie">{data.pet.species}</Descriptions.Item>
            <Descriptions.Item label="Sexo">{data.pet.sex}</Descriptions.Item>
            <Descriptions.Item label="Nascimento">
              {data.pet.birthdate
                ? dayjs(data.pet.birthdate).format("DD/MM/YYYY")
                : data.pet.birthdate_estimated
                  ? "Data estimada"
                  : "Não informado"}
            </Descriptions.Item>
            <Descriptions.Item label="Peso">
              {data.pet.weight_kg ? `${data.pet.weight_kg.toFixed(1)} kg` : "Não informado"}
            </Descriptions.Item>
            <Descriptions.Item label="Raça">{data.pet.breed ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Cor">{data.pet.color ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Microchip">{data.pet.microchip_id ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Observações">{data.pet.notes ?? "—"}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="Cuidados cadastrados" loading={isLoading}>
        <List<PetTreatment>
          dataSource={data?.treatments ?? []}
          locale={{ emptyText: "Nenhum cuidado cadastrado para este pet." }}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              actions={[
                <Link key="ver" href={`/treatments/${item.id}`}>
                  Detalhes
                </Link>,
                <Link key="editar" href={`/treatments/${item.id}/edit`}>
                  Editar
                </Link>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Tag color="blue">{item.kind}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text>
                      Próxima data:{" "}
                      {item.next_due_at ? dayjs(item.next_due_at).format("DD/MM/YYYY") : "—"}
                    </Typography.Text>
                    <Typography.Text>Status: {item.status}</Typography.Text>
                    {item.notes ? <Typography.Text type="secondary">{item.notes}</Typography.Text> : null}
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

