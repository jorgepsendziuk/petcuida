"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== "undefined") {
  throw new Error("As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias.");
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[PetCuida] Variáveis do Supabase não configuradas. Utilize o arquivo .env.local conforme docs/environment.md.",
  );
}

const fallbackUrl = supabaseUrl || "https://placeholder.supabase.co";
const fallbackAnonKey = supabaseAnonKey || "placeholder-anon-key";

export const supabaseClient = createClient<Database>(fallbackUrl, fallbackAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

