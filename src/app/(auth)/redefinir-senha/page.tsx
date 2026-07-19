import { Suspense } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { ResetForm } from "./reset-form";

// Destino do link de "Esqueceu sua senha?": o email do Supabase leva ao
// /auth/callback (troca o code por sessão) e redireciona para cá, onde o
// usuário define a nova senha já autenticado pela sessão de recuperação.
export const dynamic = "force-dynamic";

export default function RedefinirSenhaPage() {
  return (
    <AuthCard description="Defina uma nova senha para a sua conta." title="Redefinir senha">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
