import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { requestPasswordReset, resetPasswordWithCode } from "@/app/auth/actions";
import { AuthBackdrop } from "@/app/components/auth-backdrop";
import { SubmitButton } from "../submit-button";
import { OtpInput } from "../otp-input";

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
              <div className="auth-field">
                <span>Код із листа</span>
                <OtpInput />
              </div>
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
            <div className="auth-v3-foot">
              <form action={requestPasswordReset}>
                <input type="hidden" name="email" value={email} />
                <button type="submit" className="auth-v3-link">Надіслати код ще раз</button>
              </form>
              <span className="auth-v3-dot">·</span>
              <a className="auth-v3-link" href="/auth/forgot-password">Інший email</a>
            </div>
            <p className="auth-v3-hint">Не бачиш листа? Перевір папку «Спам» або «Промоакції».</p>
            <p className="auth-v3-switch">
              <a href="/auth">Повернутись до входу</a>
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
