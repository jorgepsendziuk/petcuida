"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Space, Typography, Avatar, Empty } from "antd";
import Link from "next/link";
import { CloseCircleOutlined } from "@ant-design/icons";
import { GiMale, GiFemale } from "react-icons/gi";
import { FaPaw } from "react-icons/fa";

import { supabaseClient } from "@/lib/supabase/client";
import { getSpeciesAvatarIcon } from "./genealogy-utils";
import type { Database } from "@/types/database";

const { Title, Text } = Typography;

type Pet = Database["public"]["Tables"]["pets"]["Row"] & {
  mother?: Pet | null;
  father?: Pet | null;
};

type GenealogyTreeProps = {
  petId: string;
};

const fetchPetWithParents = async (petId: string): Promise<Pet | null> => {
  const { data: pet, error } = await supabaseClient
    .from("pets")
    .select("*")
    .eq("id", petId)
    .single<Pet>();

  if (error || !pet) return null;

  // Buscar mãe e pai se existirem
  const petWithParents = pet as any;
  const [mother, father] = await Promise.all([
    petWithParents.mother_id
      ? supabaseClient
          .from("pets")
          .select("*")
          .eq("id", petWithParents.mother_id)
          .single<Pet>()
          .then(({ data }) => data)
      : Promise.resolve(null),
    petWithParents.father_id
      ? supabaseClient
          .from("pets")
          .select("*")
          .eq("id", petWithParents.father_id)
          .single<Pet>()
          .then(({ data }) => data)
      : Promise.resolve(null),
  ]);

  return {
    ...pet,
    mother,
    father,
  };
};

const fetchDescendants = async (petId: string): Promise<Pet[]> => {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("*")
    .or(`mother_id.eq.${petId},father_id.eq.${petId}`);

  if (error || !data) return [];

  // Retornar descendentes (filhos)
  return data as Pet[];
};

const isDeceased = (pet: Pet): boolean => {
  const petAny = pet as any;
  return petAny.deceased === true;
};

const getAvatarStyles = (pet: Pet, baseStyle: React.CSSProperties): React.CSSProperties => {
  const deceased = isDeceased(pet);
  return {
    ...baseStyle,
    filter: deceased ? "grayscale(100%)" : "none",
    opacity: deceased ? 0.7 : 1,
  };
};

const getSexIcon = (sex: Pet["sex"]): React.ReactNode => {
  const iconStyle = { fontSize: 14 };
  switch (sex) {
    case "male":
      return <GiMale style={iconStyle} />;
    case "female":
      return <GiFemale style={iconStyle} />;
    default:
      return <FaPaw style={iconStyle} />;
  }
};

export function GenealogyTree({ petId }: GenealogyTreeProps) {
  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet-genealogy", petId],
    queryFn: () => fetchPetWithParents(petId),
    enabled: Boolean(petId),
  });

  const { data: descendants } = useQuery({
    queryKey: ["pet-descendants", petId],
    queryFn: () => fetchDescendants(petId),
    enabled: Boolean(petId),
  });

  if (isLoading) {
    return <Card loading />;
  }

  if (!pet) {
    return <Empty description="Pet não encontrado" />;
  }

  const hasParents = pet.mother || pet.father;
  const hasDescendants = descendants && descendants.length > 0;

  // Se não tem pais nem filhos, não mostrar nada
  if (!hasParents && !hasDescendants) {
    return (
      <Card title="Árvore Genealógica">
        <Empty description="Nenhuma informação de linhagem cadastrada" />
      </Card>
    );
  }

  return (
    <Card title="Árvore Genealógica">
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {/* Pais */}
        {hasParents && (
          <div>
            <Title level={4}>Pais</Title>
            <Space size="large" wrap>
              {pet.mother && (
                <Link href={`/pets/${pet.mother.id}`}>
                  <Card size="small" style={{ minWidth: 150, textAlign: "center", cursor: "pointer", position: "relative" }}>
                    <Space orientation="vertical" size="small">
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <Avatar
                          size={64}
                          src={pet.mother.photo_url || undefined}
                          icon={getSpeciesAvatarIcon(pet.mother.species, 32)}
                          style={getAvatarStyles(pet.mother, { backgroundColor: "#ff6b6b" })}
                        />
                      </div>
                      <Text strong>Mãe</Text>
                      <Text>{pet.mother.name}</Text>
                    </Space>
                  </Card>
                </Link>
              )}
              {pet.father && (
                <Link href={`/pets/${pet.father.id}`}>
                  <Card size="small" style={{ minWidth: 150, textAlign: "center", cursor: "pointer", position: "relative" }}>
                    <Space orientation="vertical" size="small">
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <Avatar
                          size={64}
                          src={pet.father.photo_url || undefined}
                          icon={getSpeciesAvatarIcon(pet.father.species, 32)}
                          style={getAvatarStyles(pet.father, { backgroundColor: "#4ecdc4" })}
                        />
                      </div>
                      <Text strong>Pai</Text>
                      <Text>{pet.father.name}</Text>
                    </Space>
                  </Card>
                </Link>
              )}
            </Space>
          </div>
        )}

        {/* Descendentes */}
        {hasDescendants && (
          <div>
            <Title level={4}>Filhos</Title>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                width: "100%",
                alignItems: "flex-start",
              }}
            >
              {descendants?.map((child) => (
                <Link key={child.id} href={`/pets/${child.id}`} style={{ textDecoration: "none" }}>
                  <Card
                    size="small"
                    style={{
                      minWidth: 150,
                      maxWidth: 150,
                      textAlign: "center",
                      cursor: "pointer",
                      margin: 0,
                    }}
                    hoverable
                  >
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <Avatar
                          size={64}
                          src={child.photo_url || undefined}
                          icon={getSpeciesAvatarIcon(child.species, 32)}
                          style={getAvatarStyles(child, { backgroundColor: "#ffe66d" })}
                          />
                      </div>
                      <Text strong style={{ display: "block", wordBreak: "break-word" }}>
                        {child.name}
                      </Text>
                    </Space>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
}
