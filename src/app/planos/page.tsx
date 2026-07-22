import Link from "next/link";
import { OffresClient } from "@/app/(app)/offres/offres-client";

// Página pública de planos. Os preços não aparecem na landing: só aqui, ao
// clicar em "Planos". Reusa a mesma vitrine (OffresClient em publicMode).
export const dynamic = "force-dynamic";

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-[#ECEAFB] text-ink">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link className="text-lg font-semibold text-ink" href="/">Oracle</Link>
          <div className="flex items-center gap-3">
            <Link className="text-sm font-medium text-muted transition hover:text-ink" href="/">Início</Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
              href="/cadastro"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Planos</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">O plano de gestão mais adequado ao seu negócio</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Escolha entre cobrança mensal ou anual. Cancele quando quiser.</p>
        </div>
        <OffresClient currentPlan="free" publicMode />
      </main>
    </div>
  );
}
