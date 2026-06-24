import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
import { createClient } from "@/lib/supabase/server";

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

// TODO: Connect recurring invoices to subscription permissions.
const previewRows = [
  { initials: "LJ", name: "Louise Jonquille", item: "Abonnement vidéo…", frequency: "Hebdomadaire", date: "30/06/26", amount: "500,00 €" },
  { initials: "LD", name: "Laurianne Delcour", item: "Pack illustrations…", frequency: "Mensuelle", date: "Non définie", amount: "30,00 €" }
];

export default async function RecurrentesPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="recurrentes" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Factures récurrentes</h1>
            <Link className={primaryButton} href="/offres">
              + Nouveau
            </Link>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
              <p className="text-sm font-semibold text-ink">Actives</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">0</span>
            </div>
            <div aria-hidden="true" className="divide-y divide-line opacity-40">
              {previewRows.map((row) => (
                <div className="flex items-center gap-3 px-5 py-4 text-sm" key={row.initials}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-semibold text-rose-500">
                    {row.initials}
                  </span>
                  <span className="w-32 shrink-0 truncate font-medium text-ink">{row.name}</span>
                  <span className="hidden flex-1 truncate text-muted sm:block">{row.item}</span>
                  <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 sm:inline">{row.frequency}</span>
                  <span className="hidden w-20 text-right text-muted md:block">{row.date}</span>
                  <span className="ml-auto tabular-nums font-medium text-ink sm:ml-0 sm:w-24 sm:text-right">{row.amount}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">Réservé aux abonnés</span>
              <h2 className="mt-4 text-lg font-semibold text-ink">Gagnez du temps avec les factures récurrentes</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                La facturation récurrente vous permet de générer automatiquement vos factures, à la fréquence de votre
                choix.
              </p>
              <Link className={`mt-6 ${primaryButton}`} href="/offres">
                Voir nos offres
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
