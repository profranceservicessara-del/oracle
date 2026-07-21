"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";
import { AppleIcon, GoogleIcon, oauthButtonClass, SHOW_SOCIAL_LOGIN, startOAuth } from "../oauth";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha.")
});

const emailSchema = loginSchema.pick({ email: true });

function getSafeRedirectPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }
  return path;
}

// Traduz o erro cru do Supabase numa mensagem acionável — o usuário precisa
// saber se errou a senha, se falta confirmar o email ou se deve aguardar.
function loginErrorMessage(err: AuthError) {
  const code = err.code ?? "";
  if (code === "invalid_credentials") {
    return "Email ou senha incorretos. Confira os dados ou use \"Esqueceu sua senha?\".";
  }
  if (code === "email_not_confirmed") {
    return "Confirme seu email antes de entrar. Procure o link de confirmação na sua caixa de entrada.";
  }
  if (err.status === 429) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  }
  return "Não foi possível entrar. Verifique seu email e senha.";
}

// Mensagem para os fluxos que disparam email (redefinição e link mágico).
function emailFlowErrorMessage(err: AuthError, fallback: string) {
  if (err.status === 429) {
    return "Muitos emails enviados agora. Aguarde alguns minutos e tente de novo.";
  }
  return fallback;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectPath(searchParams.get("redirectTo"));
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;
  }

  // OAuth (Google/Apple). Requer o provider habilitado no painel Supabase;
  // o probe em startOAuth converte provider desativado em erro amigável.
  async function signInWithProvider(provider: "google" | "apple") {
    setError("");
    setMessage("");
    setBusy(provider);
    const { url, errorMessage } = await startOAuth(supabase, provider, callbackUrl());
    if (url) {
      window.location.href = url;
      return;
    }
    setBusy(null);
    setError(errorMessage ?? "Não foi possível iniciar o login social.");
  }

  async function signInWithPassword() {
    setError("");
    setMessage("");
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }
    setBusy("password");
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(null);
    if (authError) {
      setError(loginErrorMessage(authError));
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  async function forgotPassword() {
    setError("");
    setMessage("");
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Digite seu email acima para receber o link de redefinição.");
      return;
    }
    setBusy("forgot");
    const { error: authError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent("/redefinir-senha")}`
    });
    setBusy(null);
    if (authError) {
      setError(emailFlowErrorMessage(authError, "Não foi possível enviar o email de redefinição. Tente novamente."));
      return;
    }
    setMessage("Enviamos um link para redefinir sua senha. Confira seu email.");
  }

  async function sendMagicLink() {
    setError("");
    setMessage("");
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Digite seu email acima para receber o link mágico.");
      return;
    }
    setBusy("magic");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: callbackUrl() }
    });
    setBusy(null);
    if (authError) {
      setError(emailFlowErrorMessage(authError, "Não foi possível enviar o link mágico. Tente novamente."));
      return;
    }
    setMessage("Enviamos um link mágico para o seu email.");
  }

  const disabled = busy !== null;

  return (
    <div className="w-full">
      {SHOW_SOCIAL_LOGIN ? (
        <>
          {/* OAuth */}
          <div className="space-y-3">
            <button className={oauthButtonClass} disabled={disabled} onClick={() => void signInWithProvider("google")} type="button">
              <GoogleIcon />
              {busy === "google" ? "Redirecionando…" : "Iniciar sessão com o Google"}
            </button>
            <button className={oauthButtonClass} disabled={disabled} onClick={() => void signInWithProvider("apple")} type="button">
              <AppleIcon />
              {busy === "apple" ? "Redirecionando…" : "Conecte-se com a Apple"}
            </button>
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
          void signInWithPassword();
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
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
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
          {busy === "password" ? "Entrando…" : "Conecte-se"}
        </button>
        <button
          className="h-12 w-full rounded-full bg-slate-100 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
          disabled={disabled}
          onClick={() => void forgotPassword()}
          type="button"
        >
          {busy === "forgot" ? "Enviando…" : "Esqueceu sua senha?"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem uma conta?{" "}
        <Link className="font-semibold text-brand underline underline-offset-4 hover:text-[#003a94]" href="/cadastro">
          Criar minha conta
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        Prefere entrar sem senha?{" "}
        <button className="font-medium text-brand hover:underline disabled:opacity-60" disabled={disabled} onClick={() => void sendMagicLink()} type="button">
          {busy === "magic" ? "Enviando…" : "Receber link mágico"}
        </button>
      </p>
    </div>
  );
}
