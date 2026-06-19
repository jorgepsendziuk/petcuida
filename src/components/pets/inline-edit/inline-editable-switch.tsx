"use client";

import { useState } from "react";
import { Flex, Switch, Button, Space } from "antd";
import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Typography } from "antd";

const { Text } = Typography;

type InlineEditableSwitchProps = {
  label: string;
  value: boolean;
  onSave: (value: boolean) => Promise<void>;
  loading?: boolean;
  icon?: React.ReactNode;
};

export function InlineEditableSwitch({
  label,
  value,
  onSave,
  loading = false,
  icon,
}: InlineEditableSwitchProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value);
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

  const handleSwitchChange = async (newValue: boolean) => {
    setEditValue(newValue);
    // Salvar automaticamente ao mudar o switch
    setSaving(true);
    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Flex justify="space-between" align="center" gap="small" style={{ width: "100%" }}>
        <Flex align="center" gap="small" style={{ flex: 1 }}>
          {icon && <span>{icon}</span>}
          <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
          <Switch
            checked={editValue}
            onChange={handleSwitchChange}
            disabled={saving || loading}
          />
          <Text style={{ fontSize: 14 }}>{editValue ? "Sim" : "Não"}</Text>
        </Flex>
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleSave}
            loading={saving || loading}
            size="small"
          />
          <Button
            icon={<CloseOutlined />}
            onClick={handleCancel}
            disabled={saving || loading}
            size="small"
          />
        </Space>
      </Flex>
    );
  }

  return (
    <Flex justify="space-between" align="center" gap="small" style={{ width: "100%" }}>
      <Flex align="center" gap="small" style={{ flex: 1 }}>
        {icon && <span>{icon}</span>}
        <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
        <Text
          style={{
            fontSize: 14,
            cursor: "pointer",
            minHeight: 22,
            padding: "4px 8px",
            borderRadius: 4,
            transition: "background-color 0.2s",
          }}
          onClick={handleStartEdit}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {value ? "Sim" : "Não"}
        </Text>
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
