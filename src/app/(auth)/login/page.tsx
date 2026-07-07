import { Suspense } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/ui/auth-card";
import { LoginForm } from "./login-form";

// Página de auth: renderizada sob demanda. Evita prerender no build
// (que instanciaria o client Supabase e exigiria env em tempo de build).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta com senha ou receba um link mágico por email."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link className="font-semibold text-brand hover:text-[#003a94]" href="/cadastro">
          Criar cadastro
        </Link>
      </p>
    </AuthCard>
  );
}
