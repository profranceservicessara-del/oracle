import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function SummaryCard({
  icon,
  label,
  tone,
  value
}: {
  icon: ReactNode;
  label: string;
  tone: "blue" | "emerald" | "amber";
  value: string;
}) {
  const bubble = {
    blue: "bg-[#002D72]/5 text-[#002D72] ring-[#002D72]/15",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    amber: "bg-amber-50 text-amber-600 ring-amber-200"
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${bubble}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</p>
      </div>
    </div>
  );
}

export default async function DevisPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [devisResponse, facturesResponse] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("type", "devis")
      .order("date_emission", { ascending: false }),
    supabase.from("documents").select("source_devis_id").eq("type", "facture")
  ]);

  const devis = (devisResponse.data ?? []) as Document[];
  const invoicedDevisIds = new Set(
    ((facturesResponse.data ?? []) as Array<{ source_devis_id: string | null }>)
      .map((row) => row.source_devis_id)
      .filter((value): value is string => Boolean(value))
  );

  const issued = devis.filter((doc) => doc.status !== "draft" && doc.status !== "cancelled");
  const totalDevis = issued.reduce((sum, doc) => sum + Number(doc.total_ttc), 0);
  const factures = devis
    .filter((doc) => invoicedDevisIds.has(doc.id))
    .reduce((sum, doc) => sum + Number(doc.total_ttc), 0);
  const signes = devis
    .filter((doc) => doc.status === "accepted")
    .reduce((sum, doc) => sum + Number(doc.total_ttc), 0);
  const enAttente = devis
    .filter((doc) => doc.status === "sent")
    .reduce((sum, doc) => sum + Number(doc.total_ttc), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Orçamentos</h1>
            <div className="flex items-center gap-2">
              <Link className={secondaryButton} href="/documentos?type=devis">
                Ver todos
              </Link>
              <Link className={primaryButton} href="/documentos/novo?type=devis">
                + Novo
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total dos orçamentos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {euro.format(totalDevis)} <span className="text-sm font-normal text-muted">TTC</span>
              </p>
            </div>
            {/* Busca real: encaminha para /documentos (filtros completos). */}
            <form action="/documentos" className="flex items-center gap-2" method="get">
              <input name="type" type="hidden" value="devis" />
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3-3" />
                  </svg>
                </span>
                <Input aria-label="Buscar um orçamento" className="w-full pl-9 sm:w-64" name="q" placeholder="Buscar..." type="search" />
              </div>
              <button className={secondaryButton} type="submit">
                Filtrar
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <path d="M17 8a5 5 0 1 0 0 8" />
                  <line x1="4" x2="13" y1="11" y2="11" />
                  <line x1="4" x2="13" y1="14" y2="14" />
                </svg>
              }
              label="Faturados"
              tone="blue"
              value={euro.format(factures)}
            />
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              }
              label="Assinados"
              tone="emerald"
              value={euro.format(signes)}
            />
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              }
              label="Aguardando assinatura"
              tone="amber"
              value={euro.format(enAttente)}
            />
          </div>

          {devis.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" aria-hidden="true" className="h-44 w-auto" src="/illustrations/orcamento.png" />
              <h2 className="mt-5 text-lg font-semibold text-ink">Comece pelo seu 1º orçamento!</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">Configure e crie seu orçamento com toda a simplicidade.</p>
              <Link className={`mt-6 ${primaryButton}`} href="/documentos/novo?type=devis">
                Criar orçamento
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-black/5 sm:flex-row sm:justify-between sm:text-left">
              <p className="text-sm text-muted">
                <span className="font-semibold tabular-nums text-ink">{devis.length}</span> orçamentos emitidos.
              </p>
              <Link className={secondaryButton} href="/documentos">
                Ver todos os orçamentos
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
