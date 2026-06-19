import { clearGuestPet, getGuestPet } from "@/lib/guest-pet";
import { createPet } from "@/lib/pets/create-pet";

/** Persiste o rascunho local no Supabase após login/cadastro. */
export async function syncGuestPetToAccount(userId: string): Promise<string | null> {
  const draft = getGuestPet();
  if (!draft?.name.trim()) return null;

  const pet = await createPet({
    ownerId: userId,
    name: draft.name,
    species: draft.species,
    sex: draft.sex,
    breed: draft.breed,
    color: draft.color,
    photoUrl: draft.photo,
    notes: null,
  });

  clearGuestPet();
  return pet.id;
}
