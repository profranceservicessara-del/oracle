import { Suspense } from "react";
import { AuthBranding } from "../auth-branding";
import { LoginForm } from "./login-form";

// Página de auth: renderizada sob demanda. Evita prerender no build
// (que instanciaria o client Supabase e exigiria env em tempo de build).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      {/* Painel esquerdo — branding ProFrance (desktop) */}
      <AuthBranding />

      {/* Painel direito — formulário */}
      <section className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-lg font-semibold tracking-tight text-brand lg:hidden">Oracle</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Que bom te ver de novo!</h1>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
