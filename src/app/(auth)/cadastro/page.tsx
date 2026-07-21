import Link from "next/link";
import { Suspense } from "react";
import { AuthBranding } from "../auth-branding";
import { SignupForm } from "./signup-form";

// Página de auth: renderizada sob demanda. Evita prerender no build
// (que instanciaria o client Supabase e exigiria env em tempo de build).
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen">
      {/* Painel esquerdo — branding ProFrance (desktop), igual ao login */}
      <AuthBranding />

      {/* Painel direito — formulário */}
      <section className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-lg font-semibold tracking-tight text-brand lg:hidden">Oracle</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Crie sua conta grátis</h1>
            <p className="mt-2 text-sm text-muted">
              Comece a organizar sua faturação como auto-entrepreneur.
            </p>
          </div>
          <Suspense>
            <SignupForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-muted">
            Já tem conta?{" "}
            <Link className="font-semibold text-brand underline underline-offset-4 hover:text-[#003a94]" href="/login">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
