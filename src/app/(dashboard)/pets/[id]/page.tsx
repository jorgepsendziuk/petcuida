"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Button, Card, Flex, Space, Tag, Typography, Divider } from "antd";
import { CloseCircleOutlined, ScissorOutlined } from "@ant-design/icons";
import { FaDog, FaCat, FaDove, FaPaw } from "react-icons/fa";
import { GiMale, GiFemale } from "react-icons/gi";

import { supabaseClient } from "@/lib/supabase/client";
import { GenealogyTree } from "@/components/pets/genealogy-tree";
import { getSpeciesAvatarIcon } from "@/components/pets/genealogy-utils";
import type { Database } from "@/types/database";

type PetTreatment = Database["public"]["Tables"]["pet_treatments"]["Row"];
type Pet = Database["public"]["Tables"]["pets"]["Row"];
type TreatmentStatus = Database["public"]["Enums"]["treatment_status"];
type TreatmentKind = Database["public"]["Enums"]["treatment_kind"];

const speciesLabel: Record<Pet["species"], string> = {
  dog: "Cachorro",
  cat: "Gato",
  bird: "Ave",
  small_pet: "Pequeno porte",
  other: "Outro",
};

const sexLabel: Record<Pet["sex"], string> = {
  male: "Macho",
  female: "Fêmea",
  unknown: "Desconhecido",
};

const getSpeciesIcon = (species: Pet["species"]) => {
  switch (species) {
    case "dog":
      return <FaDog style={{ fontSize: 14 }} />;
    case "cat":
      return <FaCat style={{ fontSize: 14 }} />;
    case "bird":
      return <FaDove style={{ fontSize: 14 }} />;
    default:
      return <FaPaw style={{ fontSize: 14 }} />;
  }
};

const getSexIcon = (sex: Pet["sex"]) => {
  switch (sex) {
    case "male":
      return <GiMale style={{ fontSize: 14, color: "#1890ff" }} />;
    case "female":
      return <GiFemale style={{ fontSize: 14, color: "#eb2f96" }} />;
    default:
      return null;
  }
};

const statusLabel: Record<TreatmentStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  missed: "Perdido",
  cancelled: "Cancelado",
};

const kindLabel: Record<TreatmentKind, string> = {
  vaccine: "Vacina",
  deworming: "Vermífugo",
  tick_flea: "Carrapato/Pulga",
  general_medication: "Medicação",
  checkup: "Check-up",
};

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
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Informações do pet"
        loading={isLoading}
        extra={<Link href={`/pets/${petId}/edit`}>Editar</Link>}
      >
        {data?.pet && (
          <Flex gap="large" wrap="wrap">
            {/* Foto do pet */}
            {data.pet.photo_url && (
              <div style={{ textAlign: "center", position: "relative", display: "inline-block" }}>
                <Avatar
                  size={120}
                  src={data.pet.photo_url}
                  icon={getSpeciesAvatarIcon(data.pet.species, 60)}
                  style={{
                    border: "3px solid #667eea",
                    filter: (data.pet as any).deceased === true ? "grayscale(100%)" : "none",
                    opacity: (data.pet as any).deceased === true ? 0.7 : 1,
                  }}
                />
              </div>
            )}

            {/* Informações principais - layout compacto */}
            <Flex vertical gap="small" style={{ flex: 1, minWidth: 280 }}>
              <Flex align="center" gap="small">
                <Typography.Text strong style={{ fontSize: 20 }}>{data.pet.name}</Typography.Text>
              </Flex>

              <Flex gap="middle" wrap="wrap">
                <Space>
                  {getSpeciesIcon(data.pet.species)}
                  <Typography.Text type="secondary">Espécie:</Typography.Text>
                  <Typography.Text>{speciesLabel[data.pet.species]}</Typography.Text>
                </Space>
                <Space>
                  {getSexIcon(data.pet.sex)}
                  <Typography.Text type="secondary">Sexo:</Typography.Text>
                  <Typography.Text>{sexLabel[data.pet.sex]}</Typography.Text>
                </Space>
                <Space>
                  {(data.pet as any).castrated ? (
                    <>
                      <ScissorOutlined style={{ color: "#52c41a" }} />
                      <Typography.Text type="secondary">Castrado:</Typography.Text>
                      <Typography.Text>Sim</Typography.Text>
                    </>
                  ) : (
                    <>
                      <Typography.Text type="secondary">Castrado:</Typography.Text>
                      <Typography.Text>Não</Typography.Text>
                    </>
                  )}
                </Space>
              </Flex>

              <Divider style={{ margin: "8px 0" }} />

              {/* Informações secundárias */}
              <Flex vertical gap={8} style={{ fontSize: 14 }}>
                <Flex justify="space-between">
                  <Typography.Text type="secondary">Nascimento:</Typography.Text>
                  <Typography.Text>
                    {data.pet.birthdate
                      ? dayjs(data.pet.birthdate).format("DD/MM/YYYY")
                      : data.pet.birthdate_estimated
                        ? "Data estimada"
                        : "Não informado"}
                  </Typography.Text>
                </Flex>
                {(data.pet as any).deceased === true && (data.pet as any).death_date && (
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Data de falecimento:</Typography.Text>
                    <Typography.Text>{dayjs((data.pet as any).death_date).format("DD/MM/YYYY")}</Typography.Text>
                  </Flex>
                )}
                <Flex justify="space-between">
                  <Typography.Text type="secondary">Peso:</Typography.Text>
                  <Typography.Text>{data.pet.weight_kg ? `${data.pet.weight_kg.toFixed(1)} kg` : "Não informado"}</Typography.Text>
                </Flex>
                {data.pet.breed && (
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Raça:</Typography.Text>
                    <Typography.Text>{data.pet.breed}</Typography.Text>
                  </Flex>
                )}
                {data.pet.color && (
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Cor:</Typography.Text>
                    <Typography.Text>{data.pet.color}</Typography.Text>
                  </Flex>
                )}
                {data.pet.microchip_id && (
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Microchip:</Typography.Text>
                    <Typography.Text>{data.pet.microchip_id}</Typography.Text>
                  </Flex>
                )}
              </Flex>

              {/* Observações */}
              {data.pet.notes && (
                <>
                  <Divider style={{ margin: "8px 0" }} />
                  <Flex vertical gap={4}>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>Observações:</Typography.Text>
                    <Typography.Text style={{ fontSize: 14 }}>{data.pet.notes}</Typography.Text>
                  </Flex>
                </>
              )}
            </Flex>
          </Flex>
        )}
      </Card>

      <GenealogyTree petId={petId} />

      <Card title="Cuidados cadastrados" loading={isLoading}>
        {data?.treatments && data.treatments.length > 0 ? (
          <Flex vertical gap="middle">
            {data.treatments.map((item) => (
              <Flex key={item.id} justify="space-between" align="flex-start" style={{ padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
                <Flex vertical style={{ flex: 1 }}>
                  <Space>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Tag color="blue">{kindLabel[item.kind]}</Tag>
                  </Space>
                  <Space orientation="vertical" size={4} style={{ marginTop: 8 }}>
                    <Typography.Text>
                      Próxima data:{" "}
                      {item.next_due_at ? dayjs(item.next_due_at).format("DD/MM/YYYY") : "—"}
                    </Typography.Text>
                    <Typography.Text>Status: {statusLabel[item.status]}</Typography.Text>
                    {item.notes ? <Typography.Text type="secondary">{item.notes}</Typography.Text> : null}
                  </Space>
                </Flex>
                <Space>
                  <Link href={`/treatments/${item.id}`}>
                    <Button type="link" size="small">Detalhes</Button>
                  </Link>
                  <Link href={`/treatments/${item.id}/edit`}>
                    <Button type="link" size="small">Editar</Button>
                  </Link>
                </Space>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">Nenhum cuidado cadastrado para este pet.</Typography.Text>
        )}
      </Card>
    </Space>
  );
}

