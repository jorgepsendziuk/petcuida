"use client";

import { useState } from "react";
import { Flex, Avatar, Button, Modal } from "antd";
import { EditOutlined, PictureOutlined } from "@ant-design/icons";
import { FaPaw } from "react-icons/fa";
import { Typography } from "antd";
import { ImageCropUpload } from "../image-crop-upload";

const { Text } = Typography;

type InlineEditablePhotoProps = {
  label: string;
  value: string | null | undefined;
  onSave: (value: string | null) => Promise<void>;
  loading?: boolean;
  deceased?: boolean;
};

export function InlineEditablePhoto({
  label,
  value,
  onSave,
  loading = false,
  deceased = false,
}: InlineEditablePhotoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || null);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(value || null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value || null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Modal
        open={isEditing}
        onCancel={handleCancel}
        footer={null}
        title="Editar Foto"
        width={500}
      >
        <Flex vertical gap="middle">
          <ImageCropUpload
            value={editValue || undefined}
            onChange={(base64) => {
              setEditValue(base64 || null);
            }}
            onRemove={() => {
              setEditValue(null);
            }}
          />
          <Flex justify="flex-end" gap="small">
            <Button onClick={handleCancel} disabled={saving || loading}>
              Cancelar
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving || loading}>
              Salvar
            </Button>
          </Flex>
        </Flex>
      </Modal>
    );
  }

  return (
    <Flex justify="space-between" align="center" gap="small" style={{ width: "100%" }}>
      <Flex vertical style={{ flex: 1 }} gap={8}>
        <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
        <div style={{ textAlign: "center", position: "relative", display: "inline-block" }}>
          {value ? (
            <Avatar
              size={120}
              src={value}
              icon={<FaPaw />}
              style={{
                border: "3px solid #667eea",
                filter: deceased ? "grayscale(100%)" : "none",
                opacity: deceased ? 0.7 : 1,
                cursor: "pointer",
              }}
              onClick={handleStartEdit}
            />
          ) : (
            <div style={{ position: "relative", display: "inline-block" }}>
              <Avatar
                size={120}
                icon={<FaPaw style={{ fontSize: 60 }} />}
                style={{
                  border: "3px solid #667eea",
                  backgroundColor: "#f0f0f0",
                  cursor: "pointer",
                }}
                onClick={handleStartEdit}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  cursor: "pointer",
                  backgroundColor: "#1677ff",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
                onClick={handleStartEdit}
              >
                <PictureOutlined style={{ color: "#fff", fontSize: 16 }} />
              </div>
            </div>
          )}
        </div>
      </Flex>
      <Button
        type="text"
        icon={<EditOutlined />}
        onClick={handleStartEdit}
        size="small"
        style={{ opacity: 0.6 }}
      />
    </Flex>
  );
}
