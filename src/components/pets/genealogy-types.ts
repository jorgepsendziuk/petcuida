import type { Database } from "@/types/database";
import React from "react";
import { FaDog, FaCat, FaDove, FaPaw } from "react-icons/fa";

export type Pet = Database["public"]["Tables"]["pets"]["Row"] & {
  mother_id?: string | null;
  father_id?: string | null;
  children?: Pet[];
};

export type FullGenealogyTreeProps = {
  userId: string;
  /** Modo compacto para o dashboard — sem filtros nem card */
  embedded?: boolean;
};

export type LevelData = {
  level: number;
  pets: Pet[];
};

export type FamilyGroup = {
  id: string;
  parents: Pet[];
  children: Pet[];
  allMembers: Pet[];
};

// Funções auxiliares para criar ícones (evita JSX em arquivo .ts)
const createSpeciesIcon = (Icon: React.ComponentType<{ style?: React.CSSProperties }>, fontSize: number = 16): React.ReactNode => {
  return React.createElement(Icon, { style: { fontSize } });
};

export const speciesOptionsForEdit: { label: string; value: Pet["species"]; icon: React.ReactNode }[] = [
  { label: "Cachorro", value: "dog", icon: createSpeciesIcon(FaDog, 16) },
  { label: "Gato", value: "cat", icon: createSpeciesIcon(FaCat, 16) },
  { label: "Ave", value: "bird", icon: createSpeciesIcon(FaDove, 16) },
  { label: "Pequeno porte", value: "small_pet", icon: createSpeciesIcon(FaPaw, 16) },
  { label: "Outro", value: "other", icon: createSpeciesIcon(FaPaw, 16) },
];

export const breedOptionsForEdit: { label: string; value: string }[] = [
  { label: "SRD", value: "SRD" },
  { label: "Golden Retriever", value: "Golden Retriever" },
  { label: "Labrador", value: "Labrador" },
  { label: "Bulldog", value: "Bulldog" },
  { label: "Pastor Alemão", value: "Pastor Alemão" },
  { label: "Poodle", value: "Poodle" },
  { label: "Vira-lata", value: "Vira-lata" },
  { label: "Outro", value: "other" },
];

export const colorOptionsForEdit: { label: string; value: string }[] = [
  { label: "Preto", value: "Preto" },
  { label: "Branco", value: "Branco" },
  { label: "Marrom", value: "Marrom" },
  { label: "Amarelo", value: "Amarelo" },
  { label: "Cinza", value: "Cinza" },
  { label: "Tricolor", value: "Tricolor" },
  { label: "Outro", value: "other" },
];

export const speciesLabel: Record<Pet["species"], string> = {
  dog: "Cachorro",
  cat: "Gato",
  bird: "Ave",
  small_pet: "Pequeno porte",
  other: "Outro",
};

export const sexLabel: Record<Pet["sex"], string> = {
  male: "Macho",
  female: "Fêmea",
  unknown: "Desconhecido",
};
