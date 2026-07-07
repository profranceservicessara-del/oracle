import Link from "next/link";
import { AuthCard } from "@/components/ui/auth-card";
import { SignupForm } from "./signup-form";

// Página de auth: renderizada sob demanda. Evita prerender no build
// (que instanciaria o client Supabase e exigiria env em tempo de build).
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <AuthCard
      title="Criar cadastro"
      description="Crie sua conta para começar a organizar sua faturação como auto-entrepreneur."
    >
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link className="font-semibold text-brand hover:text-[#003a94]" href="/login">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
