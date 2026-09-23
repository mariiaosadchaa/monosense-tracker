"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value:FormDataEntryValue|null){
  const next=String(value||"/");
  return next.startsWith("/")&&!next.startsWith("//")?next:"/";
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next=safeNext(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth?error=${encodeURIComponent("Невірний email або пароль")}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "");
  const next=safeNext(formData.get("next"));
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email, password,
    options:{data:{display_name:displayName},emailRedirectTo:`${origin}/auth/callback?next=${encodeURIComponent(next)}`},
  });
  if (error) redirect(`/auth?mode=register&error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  redirect(`/auth?message=${encodeURIComponent("Перевірте пошту для підтвердження реєстрації")}&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "");
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
  });
  if (error) {
    const wait = /after (\d+) seconds?/i.exec(error.message)?.[1];
    const msg = wait
      ? `Лист уже надіслано щойно — перевір пошту, зокрема папку «Спам». Надіслати ще раз можна через ${wait} с.`
      : /rate limit/i.test(error.message)
        ? "Забагато запитів на відновлення. Перевір пошту (і «Спам») — лист міг уже прийти. Спробуй знову приблизно через годину."
        : error.message;
    redirect(`/auth/forgot-password?error=${encodeURIComponent(msg)}`);
  }
  redirect(`/auth/forgot-password?message=${encodeURIComponent("Якщо такий email зареєстровано, ми надіслали лист із посиланням для відновлення пароля")}`);
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}
