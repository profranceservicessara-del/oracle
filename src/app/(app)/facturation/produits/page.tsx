import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
import { createClient } from "@/lib/supabase/server";
import { categoryLabels, type CatalogItem } from "@/lib/types";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export default async function ProduitsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  const produits = (data ?? []) as CatalogItem[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="produits" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-ink">Produtos e serviços</h1>
            {/* O fluxo de criação/edição vive em /catalogo (modal). */}
            <Link className={primaryButton} href="/catalogo">
              + Novo
            </Link>
          </div>

          {produits.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-black/5">
                <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </span>
              <h2 className="mt-5 text-lg font-semibold text-ink">Vamos ao seu 1º produto ou serviço!</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">Adicione facilmente em alguns cliques.</p>
              <Link className={`mt-6 ${primaryButton}`} href="/catalogo">
                Adicionar produto ou serviço
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-muted">
                    <tr>
                      <th className="border-b border-line px-4 py-3 font-semibold" scope="col">Nome</th>
                      <th className="border-b border-line px-4 py-3 font-semibold" scope="col">Natureza</th>
                      <th className="border-b border-line px-4 py-3 font-semibold" scope="col">Unidade</th>
                      <th className="border-b border-line px-4 py-3 text-right font-semibold" scope="col">Preço unitário sem imposto</th>
                      <th className="border-b border-line px-4 py-3 text-right font-semibold" scope="col">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produits.map((item) => (
                      <tr className="border-b border-line last:border-b-0" key={item.id}>
                        <td className="px-4 py-3 font-medium text-ink">{item.designation}</td>
                        <td className="px-4 py-3 text-muted">{categoryLabels[item.categorie]}</td>
                        <td className="px-4 py-3 text-muted">{item.unite || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink">{euro.format(Number(item.prix_unitaire_ht))}</td>
                        <td className="px-4 py-3 text-right text-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
