import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
import { createClient } from "@/lib/supabase/server";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-black/5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</p>
      </div>
    </div>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3.5 shadow-sm ring-1 ring-black/5">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        {label}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500">0</span>
      </span>
      <svg aria-hidden="true" className="text-slate-300" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export default async function FournisseursPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // TODO: Connect supplier invoices when backend support exists.
  const zero = euro.format(0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="fournisseurs" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Faturas de fornecedores</h1>
            <Link className={primaryButton} href="/registre-des-achats">
              + Novo
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              }
              label="Faturas a pagar"
              value={zero}
            />
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              }
              label="Faturas agendadas"
              value={zero}
            />
            <SummaryCard
              icon={
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              }
              label="Faturas pagas"
              value={zero}
            />
          </div>

          <div className="mt-4 grid gap-3">
            <SectionRow label="A pagar" />
            <SectionRow label="Concluídas" />
          </div>

          <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Disponível em breve</span>
            <h2 className="mt-4 text-lg font-semibold text-ink">Você está pronto para a fatura eletrônica</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              O recebimento das suas faturas de fornecedores estará disponível em breve. Você as encontrará na
              aba Documentos.
            </p>
            <Link className={`mt-6 ${secondaryButton}`} href="/documentos">
              Ver minhas faturas
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
