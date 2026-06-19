"use client";

import { useQuery } from "@tanstack/react-query";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "is_platform_admin">;

const adminEmailsFromEnv = (): Set<string> => {
  const raw = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
};

export const usePlatformAdmin = () => {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", user!.id)
        .maybeSingle<Profile>();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const envAdmin = user?.email ? adminEmailsFromEnv().has(user.email.toLowerCase()) : false;
  const isPlatformAdmin = Boolean(profile?.is_platform_admin || envAdmin);

  return {
    isPlatformAdmin,
    isLoading: authLoading || profileLoading,
  };
};
