"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Space, Table, Tag, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Pet = Database["public"]["Tables"]["pets"]["Row"];

const speciesLabel: Record<Pet["species"], string> = {
  dog: "Cachorro",
  cat: "Gato",
  bird: "Ave",
  small_pet: "Pequeno porte",
  other: "Outro",
};

const fetchPets = async () => {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

export default function PetsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["pets", user?.id],
    queryFn: fetchPets,
    enabled: !!user?.id,
  });

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Pets cadastrados"
        extra={
          <Button type="primary" onClick={() => router.push("/pets/create")}>
            Adicionar pet
          </Button>
        }
      >
        <Table<Pet>
          rowKey="id"
          loading={isLoading}
          dataSource={data}
          pagination={{ pageSize: 10 }}
        >
          <Table.Column<Pet>
            title="Nome"
            dataIndex="name"
            render={(name: string, record) => (
              <Link href={`/pets/${record.id}`}>
                <Typography.Link>{name}</Typography.Link>
              </Link>
            )}
          />
          <Table.Column<Pet>
            title="Espécie"
            dataIndex="species"
            render={(value: Pet["species"]) => <Tag>{speciesLabel[value]}</Tag>}
          />
          <Table.Column<Pet> title="Sexo" dataIndex="sex" />
          <Table.Column<Pet>
            title="Nascimento"
            dataIndex="birthdate"
            render={(value: string | null, record) =>
              value ? dayjs(value).format("DD/MM/YYYY") : record.birthdate_estimated ? "Estimado" : "—"
            }
          />
          <Table.Column<Pet>
            title="Peso (kg)"
            dataIndex="weight_kg"
            render={(value: number | null) => (value ? `${value.toFixed(1)} kg` : "—")}
          />
          <Table.Column<Pet>
            title="Ações"
            render={(_, record) => (
              <Space>
                <Link href={`/pets/${record.id}`}>Detalhes</Link>
                <Link href={`/pets/${record.id}/edit`}>Editar</Link>
              </Space>
            )}
          />
        </Table>
      </Card>
    </Space>
  );
}

