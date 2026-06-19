"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button, Card, Space, Table, Tag, Typography, Input, Select, DatePicker, Avatar, Badge, Statistic, Row, Col } from "antd";
import { SearchOutlined, FilterOutlined, ClearOutlined, WarningOutlined, ClockCircleOutlined, CheckCircleOutlined, AlertOutlined } from "@ant-design/icons";
import { FaDog, FaCat, FaDove, FaPaw } from "react-icons/fa";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Treatment = Database["public"]["Tables"]["pet_treatments"]["Row"] & {
  pets: { name: string } | null;
};

const kindLabel: Record<Database["public"]["Enums"]["treatment_kind"], string> = {
  vaccine: "Vacina",
  deworming: "Vermífugo",
  tick_flea: "Carrapato/Pulga",
  general_medication: "Medicação",
  checkup: "Check-up",
};

const statusLabel: Record<Database["public"]["Enums"]["treatment_status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  missed: "Perdido",
  cancelled: "Cancelado",
};

const statusColors: Record<Database["public"]["Enums"]["treatment_status"], string> = {
  scheduled: "blue",
  completed: "green",
  missed: "red",
  cancelled: "gray",
};

const fetchTreatments = async () => {
  const { data, error } = await supabaseClient
    .from("pet_treatments")
    .select("*, pets(name)")
    .order("next_due_at", { ascending: true });

  if (error) throw error;
  return data as Treatment[];
};

const fetchPetsSummary = async (userId: string) => {
  // Primeiro, buscar apenas pets que têm tratamentos
  const { data: treatments, error: treatmentsError } = await supabaseClient
    .from("pet_treatments")
    .select(`
      pet_id,
      status,
      next_due_at,
      due_date,
      pets!inner (
        id,
        name,
        species,
        photo_url,
        owner_id
      )
    `)
    .eq("pets.owner_id", userId) as {
      data: Array<{
        pet_id: string;
        status: Database["public"]["Enums"]["treatment_status"];
        next_due_at: string | null;
        due_date: string | null;
        pets: Database["public"]["Tables"]["pets"]["Row"];
      }> | null;
      error: any;
    };

  if (treatmentsError) throw treatmentsError;

  // Agrupar tratamentos por pet
  const petsMap = new Map();

  treatments?.forEach((treatment) => {
    const pet = treatment.pets;
    if (!pet) return;

    if (!petsMap.has(pet.id)) {
      petsMap.set(pet.id, {
        ...pet,
        treatments: []
      });
    }

    petsMap.get(pet.id).treatments.push({
      status: treatment.status,
      next_due_at: treatment.next_due_at,
      due_date: treatment.due_date
    });
  });

  // Calcular estatísticas para cada pet
  const petsWithSummary = Array.from(petsMap.values()).map((petData) => {
    const now = dayjs();
    let total = 0;
    let scheduled = 0;
    let overdue = 0;
    let completed = 0;
    let upcoming = 0;

    petData.treatments.forEach((treatment: { status: Database["public"]["Enums"]["treatment_status"]; next_due_at: string | null; due_date: string | null }) => {
      total++;

      if (treatment.status === 'completed') {
        completed++;
      } else if (treatment.status === 'scheduled') {
        scheduled++;

        // Verificar se está vencido
        if (treatment.next_due_at) {
          const dueDate = dayjs(treatment.next_due_at);
          if (dueDate.isBefore(now, 'day')) {
            overdue++;
          } else if (dueDate.isBefore(now.add(7, 'day'))) {
            upcoming++;
          }
        } else if (treatment.due_date) {
          const dueDate = dayjs(treatment.due_date);
          if (dueDate.isBefore(now, 'day')) {
            overdue++;
          } else if (dueDate.isBefore(now.add(7, 'day'))) {
            upcoming++;
          }
        }
      }
    });

    return {
      id: petData.id,
      name: petData.name,
      species: petData.species,
      photo_url: petData.photo_url,
      summary: {
        total,
        scheduled,
        overdue,
        completed,
        upcoming,
      }
    };
  });

  // Ordenar por nome do pet
  return petsWithSummary.sort((a, b) => a.name.localeCompare(b.name));
};

export default function TreatmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["treatments", user?.id],
    queryFn: fetchTreatments,
    enabled: !!user?.id,
  });

  const { data: petsSummary, isLoading: loadingPetsSummary } = useQuery({
    queryKey: ["pets-summary", user?.id],
    queryFn: () => fetchPetsSummary(user!.id),
    enabled: !!user?.id,
  });

  // Função para obter ícone da espécie
  const getSpeciesIcon = (species: Database["public"]["Enums"]["pet_species"]) => {
    switch (species) {
      case "dog":
        return <FaDog />;
      case "cat":
        return <FaCat />;
      case "bird":
        return <FaDove />;
      default:
        return <FaPaw />;
    }
  };

  // Função para obter cor baseada no status
  const getStatusColor = (overdue: number, upcoming: number) => {
    if (overdue > 0) return "#ff4d4f"; // vermelho
    if (upcoming > 0) return "#faad14"; // amarelo
    return "#52c41a"; // verde
  };

  // Obter lista única de pets para o filtro
  const petOptions = useMemo(() => {
    if (!data) return [];
    const pets = data
      .filter(item => item.pets?.name)
      .map(item => ({ label: item.pets!.name, value: item.pet_id }))
      .filter((item, index, self) =>
        self.findIndex(pet => pet.value === item.value) === index
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    return pets;
  }, [data]);

  // Filtrar dados baseado nos filtros aplicados
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter(item => {
      // Filtro por texto de busca
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch =
          item.title?.toLowerCase().includes(searchLower) ||
          item.pets?.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.notes?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro por pet
      if (selectedPet && item.pet_id !== selectedPet) return false;

      // Filtro por tipo
      if (selectedKind && item.kind !== selectedKind) return false;

      // Filtro por status
      if (selectedStatus && item.status !== selectedStatus) return false;

      // Filtro por data
      if (dateRange && dateRange[0] && dateRange[1] && item.next_due_at) {
        const itemDate = dayjs(item.next_due_at);
        if (itemDate.isBefore(dateRange[0]) || itemDate.isAfter(dateRange[1])) {
          return false;
        }
      }

      return true;
    });
  }, [data, searchText, selectedPet, selectedKind, selectedStatus, dateRange]);

  // Limpar todos os filtros
  const clearFilters = () => {
    setSearchText("");
    setSelectedPet(null);
    setSelectedKind(null);
    setSelectedStatus(null);
    setDateRange(null);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Seção de Resumo por Pet */}
      <Card
        title="Resumo por Pet"
        size="small"
        loading={loadingPetsSummary}
      >
        {petsSummary && petsSummary.length > 0 ? (
          <Row gutter={[16, 16]}>
            {petsSummary.map((pet) => {
              const { summary } = pet;
              const hasAlerts = summary.overdue > 0 || summary.upcoming > 0;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={pet.id}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      cursor: "pointer",
                      border: hasAlerts ? "2px solid #faad14" : undefined,
                      position: "relative",
                    }}
                    onClick={() => setSelectedPet(pet.id)}
                    bodyStyle={{ padding: 12 }}
                  >
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      {/* Avatar e nome do pet */}
                      <Space align="center">
                        <Badge
                          count={hasAlerts ? <WarningOutlined style={{ color: "#faad14" }} /> : 0}
                          offset={[-5, 5]}
                        >
                          <Avatar
                            size={40}
                            src={pet.photo_url}
                            icon={getSpeciesIcon(pet.species)}
                            style={{
                              backgroundColor: getStatusColor(summary.overdue, summary.upcoming),
                              border: "2px solid #fff",
                            }}
                          />
                        </Badge>
                        <div>
                          <Typography.Text strong style={{ fontSize: 14 }}>
                            {pet.name}
                          </Typography.Text>
                          <br />
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {pet.species === "dog" ? "Cachorro" :
                             pet.species === "cat" ? "Gato" :
                             pet.species === "bird" ? "Pássaro" : "Outro"}
                          </Typography.Text>
                        </div>
                      </Space>

                      {/* Estatísticas */}
                      <Row gutter={8}>
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ fontSize: 11 }}>Total</span>}
                            value={summary.total}
                            valueStyle={{ fontSize: 16, fontWeight: "bold" }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ fontSize: 11 }}>Concluídos</span>}
                            value={summary.completed}
                            valueStyle={{ fontSize: 16, color: "#52c41a" }}
                          />
                        </Col>
                      </Row>

                      {/* Alertas */}
                      {summary.overdue > 0 && (
                        <div style={{
                          backgroundColor: "#fff2f0",
                          border: "1px solid #ffccc7",
                          borderRadius: 4,
                          padding: "4px 8px",
                          marginTop: 4,
                        }}>
                          <Space size="small">
                            <AlertOutlined style={{ color: "#ff4d4f" }} />
                            <Typography.Text style={{ fontSize: 12, color: "#ff4d4f" }}>
                              {summary.overdue} vencido{summary.overdue > 1 ? "s" : ""}
                            </Typography.Text>
                          </Space>
                        </div>
                      )}

                      {summary.upcoming > 0 && (
                        <div style={{
                          backgroundColor: "#fffbe6",
                          border: "1px solid #ffe58f",
                          borderRadius: 4,
                          padding: "4px 8px",
                          marginTop: 4,
                        }}>
                          <Space size="small">
                            <ClockCircleOutlined style={{ color: "#faad14" }} />
                            <Typography.Text style={{ fontSize: 12, color: "#faad14" }}>
                              {summary.upcoming} próxim{summary.upcoming > 1 ? "os" : "o"}
                            </Typography.Text>
                          </Space>
                        </div>
                      )}

                      {summary.scheduled > 0 && summary.overdue === 0 && summary.upcoming === 0 && (
                        <div style={{
                          backgroundColor: "#f6ffed",
                          border: "1px solid #b7eb8f",
                          borderRadius: 4,
                          padding: "4px 8px",
                          marginTop: 4,
                        }}>
                          <Space size="small">
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                            <Typography.Text style={{ fontSize: 12, color: "#52c41a" }}>
                              {summary.scheduled} agendado{summary.scheduled > 1 ? "s" : ""}
                            </Typography.Text>
                          </Space>
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Typography.Text type="secondary">
              Nenhum pet com cuidados cadastrados. Adicione tratamentos aos seus pets primeiro.
            </Typography.Text>
          </div>
        )}
      </Card>

      {/* Datagrid Principal */}
      <Card
        title="Cuidados cadastrados"
        extra={
          <Button type="primary" onClick={() => router.push("/treatments/create")}>
            Adicionar cuidado
          </Button>
        }
      >
      {/* Filtros */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SearchOutlined />
            <Input
              placeholder="Buscar por título, pet ou descrição..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
          </div>

          <Select
            placeholder="Filtrar por pet"
            value={selectedPet}
            onChange={setSelectedPet}
            style={{ width: 150 }}
            allowClear
            options={petOptions}
          />

          <Select
            placeholder="Filtrar por tipo"
            value={selectedKind}
            onChange={setSelectedKind}
            style={{ width: 150 }}
            allowClear
            options={Object.entries(kindLabel).map(([value, label]) => ({
              label,
              value,
            }))}
          />

          <Select
            placeholder="Filtrar por status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: 150 }}
            allowClear
            options={Object.entries(statusLabel).map(([value, label]) => ({
              label,
              value,
            }))}
          />

          <DatePicker.RangePicker
            placeholder={["Data inicial", "Data final"]}
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            style={{ width: 220 }}
          />

          <Button
            icon={<ClearOutlined />}
            onClick={clearFilters}
            disabled={!searchText && !selectedPet && !selectedKind && !selectedStatus && !dateRange}
          >
            Limpar filtros
          </Button>
        </Space>
      </Card>

      {/* Tabela ordenável */}
      <Table<Treatment>
        rowKey="id"
        loading={isLoading}
        dataSource={filteredData}
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} de ${total} cuidados`,
        }}
        scroll={{ x: 800 }}
      >
        <Table.Column<Treatment>
          title="Pet"
          dataIndex={["pets", "name"]}
          sorter={(a, b) => {
            const aName = a.pets?.name || "";
            const bName = b.pets?.name || "";
            return aName.localeCompare(bName);
          }}
          render={(_, record) =>
            record.pets ? (
              <Link href={`/pets/${record.pet_id}`}>
                <Typography.Link>{record.pets.name}</Typography.Link>
              </Link>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )
          }
          width={120}
        />

        <Table.Column<Treatment>
          title="Título"
          dataIndex="title"
          sorter={(a, b) => (a.title || "").localeCompare(b.title || "")}
          render={(title: string, record) => (
            <Link href={`/treatments/${record.id}`}>
              <Typography.Link>{title}</Typography.Link>
            </Link>
          )}
          width={180}
        />

        <Table.Column<Treatment>
          title="Tipo"
          dataIndex="kind"
          sorter={(a, b) => kindLabel[a.kind].localeCompare(kindLabel[b.kind])}
          filters={Object.entries(kindLabel).map(([value, label]) => ({
            text: label,
            value,
          }))}
          onFilter={(value, record) => record.kind === value}
          render={(value: Treatment["kind"]) => (
            <Tag color="geekblue">{kindLabel[value]}</Tag>
          )}
          width={120}
        />

        <Table.Column<Treatment>
          title="Status"
          dataIndex="status"
          sorter={(a, b) => statusLabel[a.status].localeCompare(statusLabel[b.status])}
          filters={Object.entries(statusLabel).map(([value, label]) => ({
            text: label,
            value,
          }))}
          onFilter={(value, record) => record.status === value}
          render={(value: Treatment["status"]) => (
            <Tag color={statusColors[value]}>{statusLabel[value]}</Tag>
          )}
          width={100}
        />

        <Table.Column<Treatment>
          title="Próximo vencimento"
          dataIndex="next_due_at"
          sorter={(a, b) => {
            const aDate = a.next_due_at ? new Date(a.next_due_at).getTime() : 0;
            const bDate = b.next_due_at ? new Date(b.next_due_at).getTime() : 0;
            return aDate - bDate;
          }}
          render={(value: string | null) => {
            if (!value) return <Typography.Text type="secondary">Não agendado</Typography.Text>;

            const date = dayjs(value);
            const now = dayjs();
            const isOverdue = date.isBefore(now, 'day');

            return (
              <span style={{ color: isOverdue ? '#ff4d4f' : 'inherit' }}>
                {date.format("DD/MM/YYYY")}
                {isOverdue && " (Vencido)"}
              </span>
            );
          }}
          width={140}
        />

        <Table.Column<Treatment>
          title="Última administração"
          dataIndex="last_administered_at"
          sorter={(a, b) => {
            const aDate = a.last_administered_at ? new Date(a.last_administered_at).getTime() : 0;
            const bDate = b.last_administered_at ? new Date(b.last_administered_at).getTime() : 0;
            return aDate - bDate;
          }}
          render={(value: string | null) =>
            value ? dayjs(value).format("DD/MM/YYYY") : <Typography.Text type="secondary">Nunca</Typography.Text>
          }
          width={140}
        />

        <Table.Column<Treatment>
          title="Frequência (dias)"
          dataIndex="frequency_days"
          sorter={(a, b) => (a.frequency_days || 0) - (b.frequency_days || 0)}
          render={(value: number | null) => value ? `${value} dias` : <Typography.Text type="secondary">—</Typography.Text>}
          width={120}
        />

        <Table.Column<Treatment>
          title="Ações"
          render={(_, record) => (
            <Space>
              <Link href={`/treatments/${record.id}`}>
                <Typography.Link>Ver</Typography.Link>
              </Link>
              <Link href={`/treatments/${record.id}/edit`}>
                <Typography.Link>Editar</Typography.Link>
              </Link>
            </Space>
          )}
          width={120}
          fixed="right"
        />
      </Table>

      {/* Resumo dos filtros aplicados */}
      {(searchText || selectedPet || selectedKind || selectedStatus || dateRange) && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 6 }}>
          <Typography.Text strong>
            <FilterOutlined style={{ marginRight: 8 }} />
            Filtros aplicados: {filteredData.length} de {data?.length || 0} cuidados
          </Typography.Text>
        </div>
      )}
    </Card>
    </Space>
  );
}

