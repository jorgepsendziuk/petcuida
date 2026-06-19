"use client";

import { useState } from "react";
import { Flex, Input, Button, Space } from "antd";
import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Typography } from "antd";

const { Text } = Typography;

type InlineEditableFieldProps = {
  label: string;
  value: string | null | undefined;
  placeholder?: string;
  onSave: (value: string | null) => Promise<void>;
  loading?: boolean;
  required?: boolean;
  multiline?: boolean;
};

export function InlineEditableField({
  label,
  value,
  placeholder = "Clique para editar",
  onSave,
  loading = false,
  required = false,
  multiline = false,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(value || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (required && !editValue.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue.trim() || null);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Flex justify="space-between" align="flex-start" gap="small" style={{ width: "100%" }}>
        <Flex vertical style={{ flex: 1 }} gap="small">
          <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
          {multiline ? (
            <Input.TextArea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={4}
              autoFocus
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onPressEnter={handleSave}
            />
          )}
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
      <Flex vertical style={{ flex: 1 }} gap={4}>
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
          {value || <Text type="secondary" style={{ fontStyle: "italic" }}>{placeholder}</Text>}
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
