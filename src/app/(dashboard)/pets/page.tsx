"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Space, Table, Tag, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { FaPaw } from "react-icons/fa";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { FullGenealogyTree } from "@/components/pets/full-genealogy-tree";
import type { Database } from "@/types/database";

type Pet = Database["public"]["Tables"]["pets"]["Row"];

const speciesLabel: Record<Pet["species"], string> = {
  dog: "Cachorro",
  cat: "Gato",
  bird: "Ave",
  small_pet: "Pequeno porte",
  other: "Outro",
};

const fetchPets = async (userId: string) => {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

export default function PetsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["pets", user?.id],
    queryFn: () => fetchPets(user!.id),
    enabled: !!user?.id,
  });

  return (
    <div style={{ width: "100%", padding: 0, position: "relative" }}>
      {user?.id && <FullGenealogyTree userId={user.id} />}
      
      <Card
        title={<div style={{ fontSize: 16, fontWeight: 600, lineHeight: "24px" }}>Pets cadastrados</div>}
        variant="borderless"
        styles={{
          body: { padding: "16px 0" },
          header: { 
            borderBottom: "1px solid #f0f0f0", 
            padding: "16px 0",
            margin: 0,
          },
        }}
        style={{ marginTop: 24 }}
      >
        <Table<Pet>
          rowKey="id"
          loading={isLoading}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          bordered={false}
        >
          <Table.Column<Pet>
            title="Nome"
            dataIndex="name"
            render={(name: string, record) => (
              <Link href={`/pets/${record.id}`} style={{ color: "#1677ff" }}>
                {name}
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

      {/* Botão flutuante para adicionar pet */}
      <Tooltip title="Adicionar pet" placement="left">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <PlusOutlined style={{ fontSize: 18 }} />
              <FaPaw style={{ fontSize: 16 }} />
            </div>
          }
          onClick={() => router.push("/pets/create")}
          style={{
            position: "fixed",
            top: 100,
            right: 24,
            zIndex: 1000,
            width: 56,
            height: 56,
            boxShadow: "0 4px 12px rgba(22, 119, 255, 0.4)",
          }}
        />
      </Tooltip>
    </div>
  );
}

