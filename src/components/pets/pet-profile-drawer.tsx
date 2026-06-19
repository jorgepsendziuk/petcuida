"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Drawer, Flex, Space, Typography, Divider, Card, Tag, App, Button, Popconfirm } from "antd";
import { FileTextOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { FaPaw } from "react-icons/fa";
import { GiMale, GiFemale } from "react-icons/gi";
import dayjs from "dayjs";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { GenealogyTree } from "@/components/pets/genealogy-tree";
import {
  filterFatherCandidates,
  filterMotherCandidates,
} from "@/components/pets/genealogy-utils";
import {
  InlineEditableField,
  InlineEditableSelect,
  InlineEditableSwitch,
  InlineEditableDate,
  InlineEditableNumber,
  InlineEditablePhoto,
} from "./inline-edit";
import type { Pet } from "./genealogy-types";
import { speciesOptionsForEdit as speciesOpts, breedOptionsForEdit as breedOpts, colorOptionsForEdit as colorOpts } from "./genealogy-types";
import type { Database } from "@/types/database";

const { Text } = Typography;

type PetProfileDrawerProps = {
  petId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialEditMode?: boolean;
};

export function PetProfileDrawer({ petId, open, onClose, onSuccess, initialEditMode = false }: PetProfileDrawerProps) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pet-details-drawer", petId],
    queryFn: async () => {
      if (!petId) return null;
      
      const [petResponse, treatmentsResponse] = await Promise.all([
        supabaseClient
          .from("pets")
          .select("*")
          .eq("id", petId)
          .maybeSingle<Database["public"]["Tables"]["pets"]["Row"]>(),
        supabaseClient
          .from("pet_treatments")
          .select("*")
          .eq("pet_id", petId)
          .order("next_due_at", { ascending: true }),
      ]);

      if (petResponse.error) throw petResponse.error;
      if (!petResponse.data) throw new Error("Pet não encontrado");
      if (treatmentsResponse.error) throw treatmentsResponse.error;

      const treatments = (treatmentsResponse.data ?? []) as Database["public"]["Tables"]["pet_treatments"]["Row"][];

      return {
        pet: petResponse.data,
        treatments,
      };
    },
    enabled: Boolean(petId) && open,
  });

  const { data: availablePets } = useQuery({
    queryKey: ["pets-options-profile-drawer", user?.id, petId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabaseClient.from("pets").select("id,name,sex").eq("owner_id", user.id);
      if (petId) {
        query = query.neq("id", petId);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; sex: Pet["sex"] }>;
    },
    enabled: Boolean(user?.id) && Boolean(petId) && open,
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!petId) throw new Error("ID do pet não encontrado");

      const payload: any = {};
      
      // Converter valores conforme necessário
      if (field === "birthdate" || field === "death_date") {
        payload[field] = value ? dayjs(value).format("YYYY-MM-DD") : null;
      } else if (field === "photo_url") {
        payload[field] = value || null;
      } else if (typeof value === "string") {
        payload[field] = value.trim() || null;
      } else {
        payload[field] = value ?? null;
      }

      const { error } = await supabaseClient.from("pets").update(payload as never).eq("id", petId);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success({
        content: "Campo atualizado com sucesso!",
        icon: <FileTextOutlined style={{ color: "#52c41a" }} />,
      });
      // Invalidar queries relacionadas
      if (petId && user?.id) {
        void queryClient.invalidateQueries({ queryKey: ["pet-details", petId] });
        void queryClient.invalidateQueries({ queryKey: ["pet-details-drawer", petId] });
        void queryClient.invalidateQueries({ queryKey: ["all-pets-genealogy", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["pet-genealogy", petId] });
        void queryClient.invalidateQueries({ queryKey: ["pets", user.id] });
      }
      // Não fechar o drawer automaticamente - permitir múltiplas edições
      // onSuccess?.(); // Removido para manter drawer aberto
    },
    onError: (error: Error) => {
      message.error(`Erro ao atualizar campo: ${error.message}`);
    },
  });

  const handleFieldSave = async (field: string, value: any) => {
    await updateFieldMutation.mutateAsync({ field, value });
  };

  const deletePetMutation = useMutation({
    mutationFn: async () => {
      if (!petId) throw new Error("Pet não encontrado");
      const { error } = await supabaseClient.from("pets").delete().eq("id", petId);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success("Pet removido.");
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: ["all-pets-genealogy", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-hub", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["pets", user.id] });
      }
      onClose();
      onSuccess?.();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const statusLabel: Record<Database["public"]["Enums"]["treatment_status"], string> = {
    scheduled: "Agendado",
    completed: "Concluído",
    missed: "Perdido",
    cancelled: "Cancelado",
  };

  const kindLabel: Record<Database["public"]["Enums"]["treatment_kind"], string> = {
    vaccine: "Vacina",
    deworming: "Vermífugo",
    tick_flea: "Carrapato/Pulga",
    general_medication: "Medicação",
    checkup: "Check-up",
  };


  if (!data?.pet) {
    return (
      <Drawer
        title={
          <Flex justify="space-between" align="center" style={{ width: "100%" }}>
            <Space>
              <FileTextOutlined />
              <Text strong>Perfil Completo</Text>
            </Space>
          </Flex>
        }
        placement="right"
        size="large"
        open={open}
        onClose={onClose}
        width={720}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Typography.Text type="secondary">Carregando...</Typography.Text>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Typography.Text type="secondary">Pet não encontrado.</Typography.Text>
          </div>
        )}
      </Drawer>
    );
  }

  const pet = data.pet;
  const petAny = pet as any;

  // Preparar opções para selects
  const speciesSelectOptions = speciesOpts.map((opt) => ({
    label: opt.label,
    value: opt.value,
    icon: opt.icon,
  }));

  const sexSelectOptions = [
    { label: "Macho", value: "male", icon: <GiMale style={{ fontSize: 14 }} /> },
    { label: "Fêmea", value: "female", icon: <GiFemale style={{ fontSize: 14 }} /> },
    { label: "Desconhecido", value: "unknown", icon: <FaPaw style={{ fontSize: 14 }} /> },
  ];

  const motherOptions = filterMotherCandidates(availablePets ?? [], {
    excludeId: petId ?? undefined,
    fatherId: petAny.father_id,
  }).map((p) => ({ label: p.name, value: p.id }));

  const fatherOptions = filterFatherCandidates(availablePets ?? [], {
    excludeId: petId ?? undefined,
    motherId: petAny.mother_id,
  }).map((p) => ({ label: p.name, value: p.id }));

  return (
    <Drawer
      title={
        <Flex justify="space-between" align="center" style={{ width: "100%" }}>
          <Space>
            <FileTextOutlined />
            <Text strong>Perfil Completo</Text>
          </Space>
        </Flex>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      width={720}
      styles={{
        body: {
          padding: 24,
        },
      }}
    >
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {/* Foto */}
        <InlineEditablePhoto
          label="Foto"
          value={petAny.photo_url}
          onSave={(value) => handleFieldSave("photo_url", value)}
          loading={updateFieldMutation.isPending}
          deceased={petAny.deceased === true}
        />

        <Divider style={{ margin: "8px 0" }} />

        {/* Nome */}
        <InlineEditableField
          label="Nome"
          value={pet.name}
          placeholder="Nome do pet"
          onSave={(value) => handleFieldSave("name", value)}
          loading={updateFieldMutation.isPending}
          required
        />

        {/* Espécie */}
        <InlineEditableSelect
          label="Espécie"
          value={pet.species}
          options={speciesSelectOptions}
          onSave={(value) => handleFieldSave("species", value)}
          loading={updateFieldMutation.isPending}
          required
          useRadio={false}
        />

        {/* Sexo */}
        <InlineEditableSelect
          label="Sexo"
          value={pet.sex}
          options={sexSelectOptions}
          onSave={(value) => handleFieldSave("sex", value)}
          loading={updateFieldMutation.isPending}
          required
          useRadio={false}
        />

        {/* Castrado */}
        <InlineEditableSwitch
          label="Castrado"
          value={petAny.castrated ?? false}
          onSave={(value) => handleFieldSave("castrated", value)}
          loading={updateFieldMutation.isPending}
          icon={<FileTextOutlined />}
        />

        {/* Falecido */}
        <InlineEditableSwitch
          label="Falecido"
          value={petAny.deceased ?? false}
          onSave={(value) => handleFieldSave("deceased", value)}
          loading={updateFieldMutation.isPending}
          icon={<CloseCircleOutlined />}
        />

        {/* Data de falecimento - só aparece se falecido */}
        {petAny.deceased === true && (
          <InlineEditableDate
            label="Data de falecimento"
            value={petAny.death_date}
            onSave={(value) => handleFieldSave("death_date", value)}
            loading={updateFieldMutation.isPending}
            required={petAny.deceased === true}
          />
        )}

        <Divider style={{ margin: "16px 0" }} />

        {/* Raça */}
        <InlineEditableSelect
          label="Raça"
          value={pet.breed || null}
          options={breedOpts.map((opt) => ({ label: opt.label, value: opt.value }))}
          onSave={(value) => handleFieldSave("breed", value)}
          loading={updateFieldMutation.isPending}
          useRadio={false}
        />

        {/* Cor */}
        <InlineEditableSelect
          label="Cor"
          value={pet.color || null}
          options={colorOpts.map((opt) => ({ label: opt.label, value: opt.value }))}
          onSave={(value) => handleFieldSave("color", value)}
          loading={updateFieldMutation.isPending}
          useRadio={false}
        />

        {/* Peso */}
        <InlineEditableNumber
          label="Peso"
          value={pet.weight_kg}
          onSave={(value) => handleFieldSave("weight_kg", value)}
          loading={updateFieldMutation.isPending}
          min={0}
          max={200}
          step={0.1}
          suffix="kg"
        />

        {/* Microchip */}
        <InlineEditableField
          label="Microchip"
          value={pet.microchip_id}
          placeholder="Número do microchip"
          onSave={(value) => handleFieldSave("microchip_id", value)}
          loading={updateFieldMutation.isPending}
        />

        {/* Data de nascimento */}
        <InlineEditableDate
          label="Data de nascimento"
          value={pet.birthdate}
          onSave={(value) => handleFieldSave("birthdate", value)}
          loading={updateFieldMutation.isPending}
        />

        {/* Data de nascimento estimada */}
        <InlineEditableSwitch
          label="Data de nascimento estimada"
          value={pet.birthdate_estimated ?? false}
          onSave={(value) => handleFieldSave("birthdate_estimated", value)}
          loading={updateFieldMutation.isPending}
        />

        <Divider style={{ margin: "16px 0" }} />

        {/* Parentesco - Mãe */}
        <InlineEditableSelect
          label="Mãe (só fêmeas)"
          value={petAny.mother_id || null}
          options={motherOptions}
          onSave={(value) => handleFieldSave("mother_id", value)}
          loading={updateFieldMutation.isPending}
          useRadio={false}
        />

        <InlineEditableSelect
          label="Pai (só machos)"
          value={petAny.father_id || null}
          options={fatherOptions}
          onSave={(value) => handleFieldSave("father_id", value)}
          loading={updateFieldMutation.isPending}
          useRadio={false}
        />

        {/* Árvore genealógica */}
        {petId && (
          <>
            <Divider style={{ margin: "16px 0" }} />
            <GenealogyTree petId={petId} />
          </>
        )}

        <Divider style={{ margin: "16px 0" }} />

        {/* Observações */}
        <InlineEditableField
          label="Observações"
          value={pet.notes}
          placeholder="Observações sobre o pet..."
          onSave={(value) => handleFieldSave("notes", value)}
          loading={updateFieldMutation.isPending}
          multiline
        />

        {/* Cuidados cadastrados */}
        <Card title="Cuidados cadastrados" loading={isLoading} style={{ marginTop: 24 }}>
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
                </Flex>
              ))}
            </Flex>
          ) : (
            <Typography.Text type="secondary">Nenhum cuidado cadastrado para este pet.</Typography.Text>
          )}
        </Card>

        <Divider style={{ margin: "16px 0" }} />
        <Popconfirm
          title="Remover este pet?"
          description="Esta ação não pode ser desfeita."
          okText="Remover"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={() => deletePetMutation.mutate()}
        >
          <Button danger block loading={deletePetMutation.isPending}>
            Remover pet
          </Button>
        </Popconfirm>
      </Space>
    </Drawer>
  );
}
