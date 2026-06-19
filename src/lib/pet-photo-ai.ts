import { supabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type PetPhotoAnalysis = {
  species?: Database["public"]["Tables"]["pets"]["Row"]["species"];
  breed?: string;
  color?: string;
  sex?: Database["public"]["Tables"]["pets"]["Row"]["sex"];
  estimatedAgeYears?: number;
  notes?: string;
};

export async function analyzePetPhoto(
  imageBase64: string,
  userId?: string | null,
): Promise<PetPhotoAnalysis | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const functionsUrl =
      process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ||
      (supabaseUrl
        ? `${supabaseUrl.replace(/\.supabase\.co$/, "")}.functions.supabase.co`
        : `${supabaseUrl}/functions/v1`);

    const session = (await supabaseClient.auth.getSession()).data.session;
    const token = session?.access_token ?? anonKey;
    if (!token) return null;

    const response = await fetch(`${functionsUrl}/pet-photo-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64, userId: userId ?? session?.user?.id ?? "guest" }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { analysis?: PetPhotoAnalysis };
    return data.analysis ?? null;
  } catch {
    return null;
  }
}
