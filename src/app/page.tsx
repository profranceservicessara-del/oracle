import Link from "next/link";
import { redirect } from "next/navigation";
import { OffresClient } from "@/app/(app)/offres/offres-client";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    title: "Faturas e devis conformes",
    description: "Numeração sequencial, imutabilidade e formato legal francês — sem planilhas."
  },
  {
    title: "Livre de recettes automático",
    description: "Cada encaissement entra no livro de receitas e alimenta seus seuils em tempo real."
  },
  {
    title: "Cotisations estimadas",
    description: "Acompanhe URSSAF, seuils micro e franchise TVA com estimativas claras por categoria."
  },
  {
    title: "Lembretes e RGPD",
    description: "Avisos de échéance e exportação/eliminação de dados conforme a lei, prontos para usar."
  }
];

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-ink">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <p className="text-lg font-semibold text-ink">Oracle</p>
          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <a className="transition hover:text-ink" href="#recursos">Recursos</a>
            <a className="transition hover:text-ink" href="#planos">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-ink transition hover:bg-slate-100"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
              href="/cadastro"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:pt-24">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] px-6 py-16 text-center shadow-lg ring-1 ring-white/10 sm:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Faturação para auto-entrepreneurs</p>
            <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
              A solução completa para gerenciar seu negócio.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              Faturação eletrônica, CRM e pagamentos, tudo em uma única ferramenta para gerenciar seu negócio de forma simples e em conformidade com a lei. Concentre-se no que realmente importa: seus clientes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-[#002D72] shadow-sm transition hover:bg-white/90 sm:w-auto"
                href="/cadastro"
              >
                Criar conta grátis
              </Link>
              <a
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10 sm:w-auto"
                href="#planos"
              >
                Ver planos
              </a>
            </div>
            <p className="mt-6 text-xs text-white/50">Sem cartão de crédito · Documentos legais em francês</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" id="recursos">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recursos</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Tudo que o micro-entrepreneur precisa</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={feature.title}>
                <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planos — mesma vitrine de /offres (fonte única), em modo público. */}
        <section className="mx-auto max-w-6xl px-4 py-12" id="planos">
          <div className="mb-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Planos</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">O plano de gestão mais adequado ao seu negócio</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">Escolha entre cobrança mensal ou anual. Cancele quando quiser.</p>
          </div>
          <OffresClient currentPlan="free" publicMode />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:flex-row sm:text-left">
            <div>
              <h2 className="text-xl font-semibold text-ink">Pronto para emitir sua primeira fatura?</h2>
              <p className="mt-2 text-sm text-muted">Crie sua conta em minutos e mantenha sua contabilidade francesa em dia.</p>
            </div>
            <Link
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
              href="/cadastro"
            >
              Criar conta grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-ink">Oracle</p>
          <nav className="flex flex-wrap gap-4">
            <Link className="transition hover:text-ink" href="/cgu-cgv">CGU / CGV</Link>
            <Link className="transition hover:text-ink" href="/mentions-legales">Mentions légales</Link>
            <Link className="transition hover:text-ink" href="/politique-de-confidentialite">Confidentialité</Link>
          </nav>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Oracle</p>
        </div>
      </footer>
    </div>
  );
}
