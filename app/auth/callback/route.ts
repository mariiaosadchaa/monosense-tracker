import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const EXPIRED = "Посилання вже використане або застаріле. Запросіть нове — і відкривайте лише найновіший лист";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requested = url.searchParams.get("next") || (type === "recovery" ? "/auth/reset-password" : "/");
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const fail = (target = "/auth") =>
    NextResponse.redirect(new URL(`${target}?error=${encodeURIComponent(EXPIRED)}`, url.origin));

  const supabase = await createClient();

  // Надійний варіант: token_hash працює в будь-якому браузері/пристрої (потрібен шаблон листа з {{ .TokenHash }})
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(type === "recovery" ? "/auth/forgot-password" : "/auth");
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // PKCE-код: спрацює лише в тому ж браузері, де запитували лист
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(next.startsWith("/auth/reset-password") ? "/auth/forgot-password" : "/auth");
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
