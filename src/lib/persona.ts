/** Visão ativa na UI (personificação para admin). */
export type AppPersona = "admin" | "caregiver" | "partner";

export const PERSONA_LABELS: Record<AppPersona, string> = {
  admin: "Admin",
  caregiver: "Tutor",
  partner: "Parceiro",
};

export const PERSONA_DESCRIPTIONS: Record<AppPersona, string> = {
  admin: "Todas as áreas — gestão e testes",
  caregiver: "Quem cuida do pet em casa",
  partner: "Clínica ou equipe veterinária parceira",
};

export const PERSONA_STORAGE_KEY = "petcuida-active-persona";

export const isAppPersona = (value: string): value is AppPersona =>
  value === "admin" || value === "caregiver" || value === "partner";
