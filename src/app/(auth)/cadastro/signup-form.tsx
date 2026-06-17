"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

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
      setError("Não foi possível criar a conta. Tente novamente.");
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
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}
      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
