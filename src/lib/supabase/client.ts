"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { BRAND_NAME } from "@/lib/brand";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Validação mais rigorosa no cliente
if (typeof window !== "undefined") {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(`[${BRAND_NAME}] Variáveis do Supabase não configuradas:`, {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl || "NÃO DEFINIDA",
    });
    throw new Error(
      "As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias. Verifique o arquivo .env.local conforme docs/environment.md."
    );
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    `[${BRAND_NAME}] Variáveis do Supabase não configuradas. Utilize o arquivo .env.local conforme docs/environment.md.`,
  );
}

const fallbackUrl = supabaseUrl || "https://placeholder.supabase.co";
const fallbackAnonKey = supabaseAnonKey || "placeholder-anon-key";

export const supabaseClient = createClient<Database>(fallbackUrl, fallbackAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

