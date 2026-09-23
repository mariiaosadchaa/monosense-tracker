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

function resetErrorText(message: string) {
  const wait = /after (\d+) seconds?/i.exec(message)?.[1];
  if (wait) return `Код уже надіслано щойно — перевір пошту, зокрема «Спам». Новий код можна запросити через ${wait} с.`;
  if (/rate limit/i.test(message)) return "Забагато запитів. Перевір пошту (і «Спам») — код міг уже прийти. Спробуй знову приблизно через годину.";
  if (/expired|invalid/i.test(message)) return "Код невірний або застарів. Запроси новий — діє лише останній надісланий код.";
  if (/password/i.test(message) && /(short|characters|weak)/i.test(message)) return "Пароль закороткий або надто простий — мінімум 8 символів.";
  if (/same/i.test(message)) return "Новий пароль має відрізнятися від старого.";
  return message;
}

// Крок 1: надсилаємо 6-значний код на пошту
export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  const q = `email=${encodeURIComponent(email)}`;
  if (error) {
    const text = resetErrorText(error.message);
    // Якщо код уже надіслано — все одно пускаємо на крок введення коду
    if (/after \d+ seconds?/i.test(error.message)) redirect(`/auth/forgot-password?step=code&${q}&message=${encodeURIComponent(text)}`);
    redirect(`/auth/forgot-password?${q}&error=${encodeURIComponent(text)}`);
  }
  redirect(`/auth/forgot-password?step=code&${q}&message=${encodeURIComponent("Ми надіслали код на пошту. Введи його нижче разом із новим паролем.")}`);
}

// Крок 2: перевіряємо код і одразу ставимо новий пароль
export async function resetPasswordWithCode(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const token = String(formData.get("code") || "").replace(/\D/g, "");
  const password = String(formData.get("password") || "");
  const back = (msg: string) =>
    redirect(`/auth/forgot-password?step=code&email=${encodeURIComponent(email)}&error=${encodeURIComponent(msg)}`);
  if (token.length < 6) back("Введи код із листа повністю.");
  if (password.length < 8) back("Пароль має бути щонайменше 8 символів.");
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error) back(resetErrorText(error.message));
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) back(resetErrorText(updateError.message));
  redirect("/");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}
