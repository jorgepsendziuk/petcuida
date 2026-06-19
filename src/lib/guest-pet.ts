import type { Database } from "@/types/database";

const STORAGE_KEY = "petcuida_guest_pet";

export type GuestPetDraft = {
  name: string;
  photo: string | null;
  species: Database["public"]["Tables"]["pets"]["Row"]["species"];
  sex: Database["public"]["Tables"]["pets"]["Row"]["sex"];
  breed: string | null;
  color: string | null;
  estimatedAgeYears: number | null;
  createdAt: string;
};

export function getGuestPet(): GuestPetDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestPetDraft;
  } catch {
    return null;
  }
}

export function saveGuestPet(draft: GuestPetDraft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearGuestPet() {
  localStorage.removeItem(STORAGE_KEY);
}

export const speciesLabel: Record<GuestPetDraft["species"], string> = {
  dog: "Cachorro",
  cat: "Gato",
  bird: "Ave",
  small_pet: "Pequeno porte",
  other: "Outro",
};

export const speciesEmoji: Record<GuestPetDraft["species"], string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  small_pet: "🐹",
  other: "🐾",
};

export function formatAge(years: number | null | undefined): string {
  if (years == null) return "—";
  if (years < 1) return "< 1 ano";
  if (years === 1) return "1 ano";
  return `~${years} anos`;
}

export function draftToScanBadges(draft: Partial<GuestPetDraft>) {
  return [
    { label: "Raça", value: draft.breed?.trim() || "SRD", tone: "purple" as const },
    { label: "Idade", value: formatAge(draft.estimatedAgeYears), tone: "pink" as const },
    { label: "Cor", value: draft.color?.trim() || "—", tone: "teal" as const },
  ];
}
