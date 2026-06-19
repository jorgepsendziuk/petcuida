"use client";

import { useState } from "react";
import { Flex, InputNumber, Button, Space } from "antd";
import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Typography } from "antd";

const { Text } = Typography;

type InlineEditableNumberProps = {
  label: string;
  value: number | null | undefined;
  onSave: (value: number | null) => Promise<void>;
  loading?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
};

export function InlineEditableNumber({
  label,
  value,
  onSave,
  loading = false,
  min = 0,
  max = 200,
  step = 0.1,
  suffix,
  placeholder = "Digite o valor",
}: InlineEditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<number | null>(value ?? null);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(value ?? null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value ?? null);
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

  const formatValue = (val: number | null | undefined) => {
    if (val === null || val === undefined) return null;
    return `${val.toFixed(step < 1 ? 1 : 0)}${suffix ? ` ${suffix}` : ""}`;
  };

  if (isEditing) {
    return (
      <Flex justify="space-between" align="flex-start" gap="small" style={{ width: "100%" }}>
        <Flex vertical style={{ flex: 1 }} gap="small">
          <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
          <InputNumber
            value={editValue ?? undefined}
            onChange={(val) => setEditValue(val ?? null)}
            min={min}
            max={max}
            step={step}
            style={{ width: "100%" }}
            placeholder={placeholder}
            suffix={suffix}
            autoFocus
            onPressEnter={handleSave}
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
          {formatValue(value) || <Text type="secondary" style={{ fontStyle: "italic" }}>{placeholder}</Text>}
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
