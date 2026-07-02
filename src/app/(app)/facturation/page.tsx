import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
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
  tone: "emerald" | "amber" | "rose";
  value: string;
}) {
  const bubble = {
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    amber: "bg-amber-50 text-amber-600 ring-amber-200",
    rose: "bg-rose-50 text-rose-600 ring-rose-200"
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

export default async function FacturationPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().slice(0, 10);
  const [documentsResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("type", "facture")
      .order("date_emission", { ascending: false }),
    supabase.from("payments").select("document_id,montant")
  ]);

  const factures = (documentsResponse.data ?? []) as Document[];
  const payments = (paymentsResponse.data ?? []) as Array<{ document_id: string; montant: number }>;
  const paidByDocument = payments.reduce((map, payment) => {
    map.set(payment.document_id, (map.get(payment.document_id) ?? 0) + Number(payment.montant));
    return map;
  }, new Map<string, number>());

  const unpaid = (facture: Document) =>
    Math.max(0, Number(facture.total_ttc) - (paidByDocument.get(facture.id) ?? 0));
  const issued = factures.filter((facture) => ["sent", "partial", "paid"].includes(facture.status));
  const pending = factures.filter((facture) => ["sent", "partial"].includes(facture.status));
  const late = pending.filter((facture) => facture.date_echeance && facture.date_echeance < today);

  const totalFacture = issued.reduce((sum, facture) => sum + Number(facture.total_ttc), 0);
  const encaisse = factures.reduce((sum, facture) => sum + (paidByDocument.get(facture.id) ?? 0), 0);
  const enRetard = late.reduce((sum, facture) => sum + unpaid(facture), 0);
  const nonPayees = pending
    .filter((facture) => !(facture.date_echeance && facture.date_echeance < today))
    .reduce((sum, facture) => sum + unpaid(facture), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="factures" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Faturas</h1>
            <div className="flex items-center gap-2">
              {/* TODO: Connect exercise selector to real fiscal years. */}
              <button className={secondaryButton} type="button">
                Todos os exercícios
              </button>
              <Link className={primaryButton} href="/documentos/novo?type=facture">
                + Novo
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total faturado</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {euro.format(totalFacture)} <span className="text-sm font-normal text-muted">TTC</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* TODO: Connect search/filter to real invoice data source. */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3-3" />
                  </svg>
                </span>
                <Input aria-label="Buscar fatura" className="w-full pl-9 sm:w-64" placeholder="Buscar..." type="search" />
              </div>
              <button className={secondaryButton} type="button">
                Filtrar
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              }
              label="Recebido"
              tone="emerald"
              value={euro.format(encaisse)}
            />
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              }
              label="Não pagas"
              tone="amber"
              value={euro.format(nonPayees)}
            />
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" x2="12" y1="8" y2="13" />
                  <line x1="12" x2="12" y1="16" y2="16" />
                </svg>
              }
              label="Em atraso"
              tone="rose"
              value={euro.format(enRetard)}
            />
          </div>

          {factures.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" aria-hidden="true" className="h-52 w-auto" src="/illustrations/faturas-empty.png" />
              <h2 className="mt-5 text-lg font-semibold text-ink">Configure, crie… fature!</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">Configure e crie sua fatura com toda a simplicidade.</p>
              <Link className={`mt-6 ${primaryButton}`} href="/documentos/novo?type=facture">
                Criar fatura
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-black/5 sm:flex-row sm:justify-between sm:text-left">
              <p className="text-sm text-muted">
                <span className="font-semibold tabular-nums text-ink">{factures.length}</span> fatura(s) emitida(s).
              </p>
              <Link className={secondaryButton} href="/documentos">
                Ver todas as faturas
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
