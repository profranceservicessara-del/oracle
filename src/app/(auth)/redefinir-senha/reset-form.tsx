"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const resetSchema = z
  .object({
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
    confirm: z.string()
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"]
  });

export function ResetForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    const parsed = resetSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados.");
      return;
    }
    setSaving(true);
    const { error: authError } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSaving(false);
    if (authError) {
      setError("Não foi possível redefinir. Abra o link do email novamente.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="block text-sm font-medium text-ink">
        Nova senha
        <Input
          autoComplete="new-password"
          className="mt-2"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo de 8 caracteres"
          type="password"
          value={password}
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        Confirmar nova senha
        <Input
          autoComplete="new-password"
          className="mt-2"
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Repita a senha"
          type="password"
          value={confirm}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={saving} type="submit">
        {saving ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
