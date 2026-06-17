"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha.")
});

const magicLinkSchema = loginSchema.pick({ email: true });

function getSafeRedirectPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectPath(searchParams.get("redirectTo"));
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  async function signInWithPassword() {
    setError("");
    setMessage("");
    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    setIsLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);
    setIsLoading(false);

    if (authError) {
      setError("Não foi possível entrar. Verifique seu email e senha.");
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  async function sendMagicLink() {
    setError("");
    setMessage("");
    const parsed = magicLinkSchema.safeParse({ email });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Informe um email válido.");
      return;
    }

    setIsMagicLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
          redirectTo
        )}`
      }
    });
    setIsMagicLoading(false);

    if (authError) {
      setError("Não foi possível enviar o link mágico. Tente novamente.");
      return;
    }

    setMessage("Enviamos um link mágico para o seu email.");
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void signInWithPassword();
      }}
    >
      <label className="block text-sm font-medium text-ink">
        Email
        <Input
          autoComplete="email"
          className="mt-2"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          type="email"
          value={email}
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        Senha
        <Input
          autoComplete="current-password"
          className="mt-2"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}
      <Button className="w-full" disabled={isLoading || isMagicLoading} type="submit">
        {isLoading ? "Entrando..." : "Entrar com senha"}
      </Button>
      <Button
        className="w-full"
        disabled={isLoading || isMagicLoading}
        onClick={() => void sendMagicLink()}
        type="button"
        variant="secondary"
      >
        {isMagicLoading ? "Enviando..." : "Receber link mágico"}
      </Button>
    </form>
  );
}
