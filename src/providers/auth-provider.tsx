"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

import { supabaseClient } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: { email: string; password: string; fullName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
    } catch (err) {
      // Melhorar mensagem de erro para "Failed to fetch"
      if (err instanceof Error && err.message.includes("fetch")) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        throw new Error(
          `Não foi possível conectar ao servidor. Verifique se a URL do Supabase está correta: ${supabaseUrl ? "configurada" : "não configurada"}.`
        );
      }
      throw err;
    }
  }, []);

  const signUp = useCallback(
    async ({ email, password, fullName }: { email: string; password: string; fullName?: string }) => {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) {
        throw error;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
    router.replace("/");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      signIn,
      signOut,
      signUp,
    }),
    [isLoading, session, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

