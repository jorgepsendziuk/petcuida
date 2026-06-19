import { useQueryClient } from "@tanstack/react-query";

import type { Database } from "@/types/database";
import { supabaseClient } from "@/lib/supabase/client";

type PetInsert = Database["public"]["Tables"]["pets"]["Insert"];

export type CreatePetInput = {
  ownerId: string;
  name: string;
  species?: PetInsert["species"];
  sex?: PetInsert["sex"];
  breed?: string | null;
  color?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
};

/** Garante profile antes do insert (FK pets.owner_id → profiles.id). */
export async function ensureProfile(ownerId: string, fullName?: string | null) {
  const { error } = await supabaseClient.from("profiles").upsert(
    {
      id: ownerId,
      full_name: fullName ?? null,
    } as never,
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function createPet(input: CreatePetInput) {
  await ensureProfile(input.ownerId);

  const base: PetInsert = {
    owner_id: input.ownerId,
    name: input.name.trim(),
    species: input.species ?? "dog",
    sex: input.sex ?? "unknown",
    breed: input.breed ?? null,
    color: input.color ?? null,
    photo_url: input.photoUrl ?? null,
    notes: input.notes ?? null,
    birthdate_estimated: false,
  };

  const withOptional = {
    ...base,
    castrated: false,
    deceased: false,
    death_date: null,
  };

  let { data, error } = await supabaseClient
    .from("pets")
    .insert(withOptional as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    const msg = (error.message || "").toLowerCase();
    const schemaIssue =
      msg.includes("schema cache") ||
      msg.includes("could not find") ||
      msg.includes("does not exist") ||
      (msg.includes("column") && msg.includes("not found"));

    if (schemaIssue) {
      const retry = await supabaseClient
        .from("pets")
        .insert(base as never)
        .select("id")
        .single<{ id: string }>();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) throw error;
  if (!data?.id) throw new Error("Pet criado mas ID não retornado.");
  return { id: data.id };
}

export function invalidatePetQueries(queryClient: ReturnType<typeof useQueryClient>, ownerId: string) {
  void queryClient.invalidateQueries({ queryKey: ["pets", ownerId] });
  void queryClient.invalidateQueries({ queryKey: ["home", ownerId] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard", ownerId] });
}
