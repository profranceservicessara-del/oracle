"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function signUp() {
    setError("");
    setMessage("");
    const parsed = signupSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    setIsLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setIsLoading(false);

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

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void signUp();
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
          autoComplete="new-password"
          className="mt-2"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo de 8 caracteres"
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
