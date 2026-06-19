import type { ReactNode } from "react";
import {
  CalendarOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  ProfileOutlined,
  ShareAltOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import type { AppPersona } from "@/lib/persona";

export type NavItem = {
  label: string;
  key: string;
  icon: ReactNode;
  personas: AppPersona[];
  /** Destaque na barra inferior (mobile) */
  primary?: boolean;
  /** Mostra FAB de cadastro de pet (só cuidador) */
  fab?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Início", key: "/dashboard", icon: <HomeOutlined />, personas: ["admin", "caregiver"], primary: true },
  { label: "Pets", key: "/pets", icon: <TeamOutlined />, personas: ["admin", "caregiver"] },
  { label: "Cuidados", key: "/treatments", icon: <SolutionOutlined />, personas: ["admin", "caregiver"], primary: true },
  { label: "Lembretes", key: "/reminders", icon: <CalendarOutlined />, personas: ["admin", "caregiver"], primary: true },
  { label: "Compartilhar", key: "/sharing", icon: <ShareAltOutlined />, personas: ["admin", "caregiver"] },
  { label: "Parceiros", key: "/clinicas", icon: <ShopOutlined />, personas: ["admin", "caregiver"] },
  { label: "Início", key: "/clinic", icon: <HomeOutlined />, personas: ["admin", "partner"], primary: true },
  { label: "Buscar", key: "/clinic/access", icon: <TeamOutlined />, personas: ["admin", "partner"] },
  { label: "Agenda", key: "/clinic/appointments", icon: <CalendarOutlined />, personas: ["admin", "partner"], primary: true },
  { label: "Fichas", key: "/clinic/pets", icon: <MedicineBoxOutlined />, personas: ["admin", "partner"] },
  { label: "Assistente", key: "/chatbot", icon: <MessageOutlined />, personas: ["admin", "caregiver"] },
  { label: "Perfil", key: "/profile", icon: <ProfileOutlined />, personas: ["admin", "caregiver", "partner"], primary: true },
];

/** Rota inicial após login por persona */
export const homePathForPersona = (persona: AppPersona) =>
  persona === "partner" ? "/clinic" : "/dashboard";

/** Rotas fullscreen (sem shell) — não redirecionar */
export const FULLSCREEN_HUB_PATHS = ["/dashboard", "/clinic", "/clinic/setup"] as const;

export const isFullscreenHubPath = (pathname: string, persona: AppPersona) =>
  persona === "partner"
    ? pathname === "/clinic" || pathname === "/dashboard"
    : pathname === "/dashboard";

export const isPathAllowedForPersona = (pathname: string, persona: AppPersona) => {
  if (pathname === "/clinic/setup") return true;
  if (isFullscreenHubPath(pathname, persona)) return true;

  return NAV_ITEMS.some(
    (item) =>
      item.personas.includes(persona) &&
      (pathname === item.key || pathname.startsWith(`${item.key}/`)),
  );
};

export const menuItemsForPersona = (persona: AppPersona) =>
  NAV_ITEMS.filter((item) => item.personas.includes(persona)).map(({ label, key, icon }) => ({
    label,
    key,
    icon,
  }));

export const primaryNavForPersona = (persona: AppPersona) =>
  NAV_ITEMS.filter((item) => item.personas.includes(persona) && item.primary);

export const showPetFab = (persona: AppPersona) =>
  persona === "caregiver" || persona === "admin";

export const findSelectedNavKey = (pathname: string, persona: AppPersona) => {
  const items = NAV_ITEMS.filter((item) => item.personas.includes(persona));
  if (pathname === "/") return items[0]?.key ?? "/dashboard";
  const match = items
    .filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
    .sort((a, b) => b.key.length - a.key.length);
  return match[0]?.key ?? items[0]?.key ?? "/dashboard";
};
