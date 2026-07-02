"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import {
  categoryLabel,
  periodOptions,
  sumCategoryTotals,
  type RevenueBookRow
} from "@/lib/accounting";
import type { Profile } from "@/lib/types";

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function availableYears(rows: RevenueBookRow[]) {
  const years = [...new Set(rows.map((row) => row.date.slice(0, 4)))].sort().reverse();
  return years.length > 0 ? years : [String(new Date().getFullYear())];
}

export function LivreDeRecettesClient({
  profile,
  rows
}: {
  profile: Profile | null;
  rows: RevenueBookRow[];
}) {
  const years = useMemo(() => availableYears(rows), [rows]);
  const periodicite = profile?.declaration_periodicite ?? "trimestral";
  const [year, setYear] = useState(years[0]);
  const options = useMemo(() => periodOptions(Number(year), periodicite), [periodicite, year]);
  const [period, setPeriod] = useState(options[0]?.value ?? "1");
  const selectedPeriod = options.find((option) => option.value === period) ?? options[0];

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) => selectedPeriod && row.date >= selectedPeriod.start && row.date <= selectedPeriod.end
      ),
    [rows, selectedPeriod]
  );
  const totals = useMemo(() => sumCategoryTotals(filteredRows), [filteredRows]);
  const query = `year=${year}&period=${period}&periodicite=${periodicite}`;

  const columns: DataTableColumn<RevenueBookRow>[] = [
    { header: "Date", render: (row) => row.date },
    { header: "Facture", render: (row) => row.numero },
    { header: "Client", render: (row) => row.clientName },
    { header: "Nature", render: (row) => categoryLabel(row.category) },
    { header: "Montant", render: (row) => euroFormatter.format(row.montant) },
    { header: "Moyen de paiement", render: (row) => row.moyen }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Livre de recettes</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Encaissements</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href={`/api/livre-de-recettes/export?format=csv&${query}`}
          >
            Export CSV
          </a>
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href={`/api/livre-de-recettes/export?format=pdf&${query}`}
          >
            Export PDF
          </a>
        </div>
      </div>

      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Ano
          <Select className="mt-2" onChange={(event) => setYear(event.target.value)} value={year}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Período
          <Select className="mt-2" onChange={(event) => setPeriod(event.target.value)} value={period}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-sm text-muted">Vente</p>
          <p className="mt-1 text-xl font-semibold">{euroFormatter.format(totals.vente)}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-sm text-muted">Service BIC</p>
          <p className="mt-1 text-xl font-semibold">{euroFormatter.format(totals.service_bic)}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-sm text-muted">Service BNC</p>
          <p className="mt-1 text-xl font-semibold">{euroFormatter.format(totals.service_bnc)}</p>
        </div>
      </section>

      <DataTable
        columns={columns}
        emptyMessage="Nenhum encaixe nesse período."
        getRowKey={(row) => row.id}
        rows={filteredRows}
      />
    </main>
  );
}
