// Peças de OAuth compartilhadas entre /login e /cadastro: ícones, classe
// visual dos botões e o fluxo de autorização com probe. Módulo client-safe.

import type { SupabaseClient } from "@supabase/supabase-js";

// Login social (Google/Apple) oculto até os providers serem configurados
// no painel Supabase. Trocar para true reativa os botões em /login e
// /cadastro — nenhuma outra mudança necessária.
export const SHOW_SOCIAL_LOGIN = false;

export const oauthButtonClass =
  "flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-sm font-semibold text-ink ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 disabled:opacity-60";

export function GoogleIcon() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 24 24" width="18">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.98 10.98 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg aria-hidden fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.52-3.23 0-1.44.66-2.2.47-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.79-.16 2.28-.85 3.94-.72 1.42.11 2.7.68 3.55 1.79-3.14 1.88-2.48 5.9.5 7.05-.53 1.42-1.24 2.83-3.07 4.05zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export type OAuthProvider = "google" | "apple";

export function providerLabel(provider: OAuthProvider) {
  return provider === "google" ? "Google" : "Apple";
}

// Inicia o OAuth com probe: se o provider não estiver habilitado no painel
// Supabase, o endpoint /authorize responde 400 — devolvemos um erro amigável
// em vez de jogar o usuário numa página de erro JSON. Retorna a URL de
// autorização pronta para redirect, ou uma mensagem de erro.
export async function startOAuth(
  supabase: SupabaseClient,
  provider: OAuthProvider,
  callbackUrl: string
): Promise<{ url?: string; errorMessage?: string }> {
  const name = providerLabel(provider);
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl, skipBrowserRedirect: true }
    });
    if (error || !data?.url) {
      return { errorMessage: `Login com ${name} ainda não está ativado. Use email e senha.` };
    }
    const probe = await fetch(data.url, { redirect: "manual" });
    // opaqueredirect (status 0) = provider ativo, vai redirecionar. 400 = desativado.
    if (probe.type !== "opaqueredirect" && !probe.ok) {
      return { errorMessage: `Login com ${name} ainda não está ativado. Use email e senha.` };
    }
    return { url: data.url };
  } catch {
    return { errorMessage: `Login com ${name} indisponível no momento. Use email e senha.` };
  }
}
