import { Suspense } from "react";
import { LoginForm } from "./login-form";

// Página de auth: renderizada sob demanda. Evita prerender no build
// (que instanciaria o client Supabase e exigiria env em tempo de build).
export const dynamic = "force-dynamic";

const FEATURES = [
  "Faturas e orçamentos conformes",
  "Livro de receitas automático",
  "Declaração URSSAF preparada",
  "Conselheiro humano em até 48h"
];

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      {/* Painel esquerdo — branding ProFrance (desktop) */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#020D2C] via-[#0A2352] to-[#122C6E] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#1D4ED8]/25 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#5B3FA0]/20 blur-[110px]" />
        <div className="relative z-10">
          <p className="text-xl font-semibold tracking-tight text-white">Oracle</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Sistema financeiro</p>
        </div>
        <div className="relative z-10">
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">
            Gestão fiscal francesa, em português.
          </h2>
          <ul className="mt-6 space-y-3">
            {FEATURES.map((f) => (
              <li className="flex items-center gap-3 text-sm text-white/85" key={f}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20">
                  <svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="13"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/45">
          Feito para autoempreendedores brasileiros na França.
        </p>
      </aside>

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
