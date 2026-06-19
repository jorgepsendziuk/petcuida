"use client";

import { useState } from "react";
import { Flex, DatePicker, Button, Space } from "antd";
import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

type InlineEditableDateProps = {
  label: string;
  value: string | null | undefined;
  onSave: (value: string | null) => Promise<void>;
  loading?: boolean;
  required?: boolean;
  placeholder?: string;
};

export function InlineEditableDate({
  label,
  value,
  onSave,
  loading = false,
  required = false,
  placeholder = "Selecione a data",
}: InlineEditableDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<Dayjs | null>(value ? dayjs(value) : null);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(value ? dayjs(value) : null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value ? dayjs(value) : null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (required && !editValue) {
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue ? editValue.format("YYYY-MM-DD") : null);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return dayjs(dateStr).format("DD/MM/YYYY");
  };

  if (isEditing) {
    return (
      <Flex justify="space-between" align="flex-start" gap="small" style={{ width: "100%" }}>
        <Flex vertical style={{ flex: 1 }} gap="small">
          <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
          <DatePicker
            value={editValue}
            onChange={(date) => setEditValue(date)}
            format="DD/MM/YYYY"
            style={{ width: "100%" }}
            placeholder={placeholder}
          />
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
          {formatDate(value) || <Text type="secondary" style={{ fontStyle: "italic" }}>{placeholder}</Text>}
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
