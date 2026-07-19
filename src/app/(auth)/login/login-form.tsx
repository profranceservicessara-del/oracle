"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

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

const oauthButton =
  "flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 disabled:opacity-60";

function GoogleIcon() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 24 24" width="18">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.98 10.98 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.52-3.23 0-1.44.66-2.2.47-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.79-.16 2.28-.85 3.94-.72 1.42.11 2.7.68 3.55 1.79-3.14 1.88-2.48 5.9.5 7.05-.53 1.42-1.24 2.83-3.07 4.05zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
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

  // OAuth (Google/Apple). Requer o provider habilitado no painel Supabase.
  // skipBrowserRedirect + probe: se o provider não estiver ativado, o endpoint
  // /authorize responde 400 — mostramos erro amigável em vez de jogar o
  // usuário numa página de erro JSON do Supabase.
  async function signInWithProvider(provider: "google" | "apple") {
    setError("");
    setMessage("");
    setBusy(provider);
    const providerName = provider === "google" ? "Google" : "Apple";
    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl(), skipBrowserRedirect: true }
      });
      if (authError || !data?.url) {
        setError(`Login com ${providerName} ainda não está ativado. Use email e senha.`);
        return;
      }
      const probe = await fetch(data.url, { redirect: "manual" });
      // opaqueredirect (status 0) = provider ativo, vai redirecionar. 400 = desativado.
      if (probe.type !== "opaqueredirect" && !probe.ok) {
        setError(`Login com ${providerName} ainda não está ativado. Use email e senha.`);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(`Login com ${providerName} indisponível no momento. Use email e senha.`);
    } finally {
      setBusy(null);
    }
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
      setError("Não foi possível entrar. Verifique seu email e senha.");
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
      setError("Não foi possível enviar o email de redefinição. Tente novamente.");
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
      setError("Não foi possível enviar o link mágico. Tente novamente.");
      return;
    }
    setMessage("Enviamos um link mágico para o seu email.");
  }

  const disabled = busy !== null;

  return (
    <div className="w-full">
      {/* OAuth */}
      <div className="space-y-3">
        <button className={oauthButton} disabled={disabled} onClick={() => void signInWithProvider("google")} type="button">
          <GoogleIcon />
          {busy === "google" ? "Redirecionando…" : "Iniciar sessão com o Google"}
        </button>
        <button className={oauthButton} disabled={disabled} onClick={() => void signInWithProvider("apple")} type="button">
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
