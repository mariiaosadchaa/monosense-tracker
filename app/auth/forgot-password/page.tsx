import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requestPasswordReset, resetPasswordWithCode } from "@/app/auth/actions";
import { AuthBackdrop } from "@/app/components/auth-backdrop";
import { SubmitButton } from "../submit-button";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; step?: string; email?: string }>;
}) {
  if (!hasSupabaseConfig) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");
  const params = await searchParams;
  const email = params.email || "";
  const codeStep = params.step === "code" && !!email;

  return (
    <main className="auth-v3">
      <AuthBackdrop />
      <div className="auth-v3-card">
        <h1>{codeStep ? "Введи код" : "Відновлення пароля"}</h1>
        <p>
          {codeStep ? (
            <>
              Код надіслано на <b>{email}</b>
            </>
          ) : (
            "Надішлемо код підтвердження на твою пошту"
          )}
        </p>

        {params.error && <div className="form-message error">{params.error}</div>}
        {params.message && !params.error && <div className="form-message success">{params.message}</div>}

        {codeStep ? (
          <>
            <form action={resetPasswordWithCode} className="auth-v3-form">
              <input type="hidden" name="email" value={email} />
              <label>
                Код із листа
                <input
                  name="code"
                  className="otp-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9 ]{6,10}"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="000000"
                />
              </label>
              <label>
                Новий пароль
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Щонайменше 8 символів"
                />
              </label>
              <SubmitButton pendingText="Перевіряю…">Змінити пароль і увійти</SubmitButton>
            </form>
            <form action={requestPasswordReset} className="auth-v3-resend">
              <input type="hidden" name="email" value={email} />
              <span>Не прийшов код? Перевір «Спам» або</span>
              <button type="submit">надіслати ще раз</button>
            </form>
            <p className="auth-v3-switch">
              <a href="/auth/forgot-password">Інший email</a> · <a href="/auth">Повернутись до входу</a>
            </p>
          </>
        ) : (
          <>
            <form action={requestPasswordReset} className="auth-v3-form">
              <label>
                Email
                <input name="email" type="email" required autoComplete="email" defaultValue={email} placeholder="you@example.com" />
              </label>
              <SubmitButton pendingText="Надсилаю…">Отримати код</SubmitButton>
            </form>
            <p className="auth-v3-switch">
              <a href="/auth">Повернутись до входу</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
