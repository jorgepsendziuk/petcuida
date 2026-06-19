"use client";

import { Alert } from "antd";

import { PERSONA_LABELS } from "@/lib/persona";
import { usePersona } from "@/providers/persona-provider";

export const PersonaPreviewBanner = () => {
  const { isPreviewMode, persona } = usePersona();

  if (!isPreviewMode) return null;

  return (
    <Alert
      type="warning"
      showIcon
      banner
      message={`Modo teste — você está vendo a interface como ${PERSONA_LABELS[persona]}. Seus dados e permissões reais não mudam.`}
      style={{ marginBottom: 0, borderRadius: 0 }}
    />
  );
};
