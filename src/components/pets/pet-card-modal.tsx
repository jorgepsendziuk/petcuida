"use client";

import { useMemo } from "react";
import { Modal, Avatar, Typography, Divider, Space, Button } from "antd";
import { CloseOutlined, CloseCircleOutlined, FileTextOutlined, EditOutlined } from "@ant-design/icons";
import { FaPaw } from "react-icons/fa";
import type { Pet } from "./genealogy-types";
import { speciesLabel } from "./genealogy-types";
import {
  getCardColor,
  getAvatarColor,
  getAvatarStyles,
  isDeceased,
  calculateAge,
  getSpeciesAvatarIcon,
} from "./genealogy-utils";

const { Text } = Typography;

type PetCardModalProps = {
  pet: Pet | null;
  open: boolean;
  onClose: () => void;
  allPets: Pet[];
  onViewProfile: (petId: string, editMode?: boolean) => void;
};

export function PetCardModal({ pet, open, onClose, allPets, onViewProfile }: PetCardModalProps) {
  if (!pet) return null;

  const petAny = pet as any;
  const hasParents = petAny.mother_id || petAny.father_id;
  
  // Buscar filhos
  const children = useMemo(() => {
    return allPets.filter((p) => {
      const pAny = p as any;
      return pAny.mother_id === pet.id || pAny.father_id === pet.id;
    });
  }, [allPets, pet.id]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={<CloseOutlined style={{ fontSize: 18 }} />}
      width={420}
      centered
      styles={{
        body: {
          padding: 0,
        },
      }}
      style={{
        borderRadius: 16,
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: 40,
          background: `linear-gradient(135deg, ${getCardColor(pet.sex)} 0%, #ffffff 50%)`,
          borderRadius: 16,
        }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <Avatar
            size={140}
            src={pet.photo_url || undefined}
            icon={getSpeciesAvatarIcon(pet.species, 60)}
            style={getAvatarStyles(
              pet,
              {
                backgroundColor: getAvatarColor(pet.sex, children.length > 0, hasParents),
                marginBottom: 24,
                border: "5px solid #fff",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              },
              children.length > 0,
              hasParents
            )}
          />
        </div>
        <Typography.Title level={2} style={{ marginBottom: 8, marginTop: 0, color: "#262626", fontSize: 24 }}>
          {pet.name}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 16, display: "block", marginBottom: 24 }}>
          {calculateAge(pet)}
        </Typography.Text>

        <Divider style={{ margin: "24px 0" }} />

        <Space orientation="vertical" size="middle" style={{ width: "100%", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text type="secondary" style={{ fontSize: 14 }}>Espécie:</Text>
            <Text strong style={{ fontSize: 14 }}>{speciesLabel[pet.species]}</Text>
          </div>
          {pet.breed && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary" style={{ fontSize: 14 }}>Raça:</Text>
              <Text style={{ fontSize: 14 }}>{pet.breed}</Text>
            </div>
          )}
          {pet.weight_kg && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary" style={{ fontSize: 14 }}>Peso:</Text>
              <Text style={{ fontSize: 14 }}>{pet.weight_kg.toFixed(1)} kg</Text>
            </div>
          )}
          {pet.color && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary" style={{ fontSize: 14 }}>Cor:</Text>
              <Text style={{ fontSize: 14 }}>{pet.color}</Text>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text type="secondary" style={{ fontSize: 14 }}>Sexo:</Text>
            <Text style={{ fontSize: 14 }}>
              {pet.sex === "male" ? "Macho" : pet.sex === "female" ? "Fêmea" : "Desconhecido"}
            </Text>
          </div>
        </Space>

        <Divider style={{ margin: "24px 0" }} />

        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Button
            type="primary"
            block
            size="large"
            icon={<FileTextOutlined />}
            onClick={() => {
              onClose();
              onViewProfile(pet.id, false);
            }}
            style={{ height: 48, fontSize: 16, borderRadius: 8 }}
          >
            Ver Perfil Completo
          </Button>
          <Button
            type="default"
            block
            size="large"
            icon={<EditOutlined />}
            onClick={() => {
              onClose();
              onViewProfile(pet.id, true);
            }}
            style={{ height: 48, fontSize: 16, borderRadius: 8 }}
          >
            Editar Pet
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
