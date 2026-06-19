"use client";

import { useState } from "react";
import { Flex, Select, Button, Space, Radio } from "antd";
import { CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import { Typography } from "antd";

const { Text } = Typography;

type SelectOption = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

type InlineEditableSelectProps = {
  label: string;
  value: string | null | undefined;
  options: SelectOption[];
  onSave: (value: string | null) => Promise<void>;
  loading?: boolean;
  required?: boolean;
  useRadio?: boolean;
  placeholder?: string;
};

export function InlineEditableSelect({
  label,
  value,
  options,
  onSave,
  loading = false,
  required = false,
  useRadio = false,
  placeholder = "Selecione uma opção",
}: InlineEditableSelectProps) {
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
    if (required && !editValue) {
      return;
    }
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

  const handleSelectChange = async (newValue: string) => {
    setEditValue(newValue);
    if (!useRadio) {
      // Para Select, salvar automaticamente ao escolher
      setSaving(true);
      try {
        await onSave(newValue);
        setIsEditing(false);
      } catch (error) {
        console.error("Erro ao salvar:", error);
      } finally {
        setSaving(false);
      }
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);

  if (isEditing) {
    return (
      <Flex justify="space-between" align="flex-start" gap="small" style={{ width: "100%" }}>
        <Flex vertical style={{ flex: 1 }} gap="small">
          <Text type="secondary" style={{ fontSize: 13 }}>{label}:</Text>
          {useRadio ? (
            <Radio.Group
              value={editValue || undefined}
              onChange={(e) => setEditValue(e.target.value)}
              style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
            >
              {options.map((option) => (
                <Radio.Button key={option.value} value={option.value} style={{ height: 40, fontSize: 14 }}>
                  {option.icon && <span style={{ marginRight: 6 }}>{option.icon}</span>}
                  {option.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          ) : (
            <Select
              value={editValue || undefined}
              onChange={handleSelectChange}
              placeholder={placeholder}
              style={{ width: "100%" }}
              options={options.map((opt) => ({
                label: (
                  <span>
                    {opt.icon && <span style={{ marginRight: 6 }}>{opt.icon}</span>}
                    {opt.label}
                  </span>
                ),
                value: opt.value,
              }))}
              loading={saving || loading}
            />
          )}
        </Flex>
        {useRadio && (
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
        )}
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
          {selectedOption ? (
            <span>
              {selectedOption.icon && <span style={{ marginRight: 6 }}>{selectedOption.icon}</span>}
              {selectedOption.label}
            </span>
          ) : (
            <Text type="secondary" style={{ fontStyle: "italic" }}>{placeholder}</Text>
          )}
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
