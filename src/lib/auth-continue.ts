import { supabaseClient } from "@/lib/supabase/client";

export type AuthContinueResult =
  | { ok: true }
  | { ok: false; message: string; info?: boolean };

export async function continueWithEmail(
  email: string,
  password: string,
): Promise<AuthContinueResult> {
  const trimmedEmail = email.trim().toLowerCase();

  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (!signInError && signInData.session) {
    return { ok: true };
  }

  const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
    email: trimmedEmail,
    password,
  });

  if (signUpError) {
    const alreadyExists =
      signUpError.message.toLowerCase().includes("already registered") ||
      signUpError.message.toLowerCase().includes("already been registered") ||
      signUpError.message.toLowerCase().includes("user already");

    if (alreadyExists) {
      return { ok: false, message: "Senha incorreta para este e-mail." };
    }

    return { ok: false, message: signUpError.message };
  }

  if (signUpData.session) {
    return { ok: true };
  }

  const { error: retryError } = await supabaseClient.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (!retryError) {
    return { ok: true };
  }

  return {
    ok: false,
    message: "Confira seu e-mail para confirmar a conta.",
    info: true,
  };
}
