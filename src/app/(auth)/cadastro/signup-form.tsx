"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";
import { AppleIcon, GoogleIcon, oauthButtonClass, SHOW_APPLE_LOGIN, SHOW_SOCIAL_LOGIN, startOAuth } from "../oauth";

const signupSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

// Traduz o erro cru do Supabase numa mensagem acionável em vez de um
// genérico "tente novamente" — o usuário precisa saber o que fazer.
function signupErrorMessage(err: AuthError) {
  const code = err.code ?? "";
  if (err.status === 429 || code === "over_email_send_rate_limit") {
    return "Muitas tentativas de cadastro agora. Aguarde alguns minutos e tente de novo.";
  }
  if (code === "user_already_exists" || /already registered|already been registered/i.test(err.message)) {
    return "Este email já tem conta. Faça login ou use \"Esqueceu sua senha?\".";
  }
  if (code === "weak_password") {
    return "Senha fraca. Use pelo menos 8 caracteres, com letras e números.";
  }
  if (code === "email_address_invalid") {
    return "Email inválido. Confira o endereço digitado.";
  }
  if (code === "signup_disabled") {
    return "Cadastro temporariamente indisponível. Tente novamente mais tarde.";
  }
  return "Não foi possível criar a conta. Tente novamente em instantes.";
}

export function SignupForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback`;
  }

  // OAuth (Google/Apple): no Supabase, o mesmo fluxo cria a conta no
  // primeiro acesso. O probe em startOAuth converte provider desativado
  // em erro amigável.
  async function signUpWithProvider(provider: "google" | "apple") {
    setError("");
    setMessage("");
    setBusy(provider);
    const { url, errorMessage } = await startOAuth(supabase, provider, callbackUrl());
    if (url) {
      window.location.href = url;
      return;
    }
    setBusy(null);
    setError(errorMessage ?? "Não foi possível iniciar o cadastro social.");
  }

  async function signUp() {
    setError("");
    setMessage("");
    const parsed = signupSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    setBusy("password");
    const { data, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: callbackUrl()
      }
    });
    setBusy(null);

    if (authError) {
      setError(signupErrorMessage(authError));
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setMessage("Cadastro criado. Confira seu email para confirmar o acesso.");
  }

  const disabled = busy !== null;

  return (
    <div className="w-full">
      {SHOW_SOCIAL_LOGIN ? (
        <>
          {/* OAuth */}
          <div className="space-y-3">
            <button className={oauthButtonClass} disabled={disabled} onClick={() => void signUpWithProvider("google")} type="button">
              <GoogleIcon />
              {busy === "google" ? "Redirecionando…" : "Cadastre-se com o Google"}
            </button>
            {SHOW_APPLE_LOGIN ? (
              <button className={oauthButtonClass} disabled={disabled} onClick={() => void signUpWithProvider("apple")} type="button">
                <AppleIcon />
                {busy === "apple" ? "Redirecionando…" : "Cadastre-se com a Apple"}
              </button>
            ) : null}
          </div>

          {/* Divisor */}
          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-sm text-muted">Ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      ) : null}

      {/* Email + senha */}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void signUp();
        }}
      >
        <input
          autoComplete="email"
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-mail"
          type="email"
          value={email}
        />
        <div className="relative">
          <input
            autoComplete="new-password"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha (mínimo de 8 caracteres)"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-ink"
            onClick={() => setShowPassword((v) => !v)}
            type="button"
          >
            {showPassword ? (
              <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
            ) : (
              <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a17.4 17.4 0 0 1 4.06-4.94" /><path d="M9.9 4.24A9.9 9.9 0 0 1 12 4c6.5 0 10 7 10 7a17.5 17.5 0 0 1-2.16 3.19" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
            )}
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <button
          className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] disabled:opacity-60"
          disabled={disabled}
          type="submit"
        >
          {busy === "password" ? "Criando…" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
