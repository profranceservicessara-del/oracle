"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import type { DocumentType } from "@/lib/types";
import { documentTypeUiLabels } from "@/lib/types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

export type DraftRow = {
  id: string;
  type: DocumentType;
  numero: string | null;
  clientName: string;
  dateEmission: string | null;
  totalTtc: number;
  createdAt: string;
};

type TypeFilter = "todos" | DocumentType;

const typeBadges: Record<DocumentType, string> = {
  devis: "bg-sky-50 text-sky-700 ring-sky-200",
  facture: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  avoir: "bg-amber-50 text-amber-700 ring-amber-200"
};

const filters: { key: TypeFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "devis", label: "Orçamentos" },
  { key: "facture", label: "Faturas" },
  { key: "avoir", label: "Notas de crédito" }
];

export function RascunhosClient({ rows }: { rows: DraftRow[] }) {
  const [filter, setFilter] = useState<TypeFilter>("todos");

  const visibleRows = useMemo(
    () => (filter === "todos" ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter]
  );

  const total = visibleRows.reduce((sum, r) => sum + r.totalTtc, 0);

  const kpis = [
    { label: "Rascunhos", value: String(visibleRows.length), tone: "text-ink" },
    { label: "Valor total TTC", value: euro.format(total), tone: "text-ink" }
  ];

  function exportCsv() {
    const header = ["Tipo", "Número", "Cliente", "Data de emissão", "Total TTC"];
    const body = visibleRows.map((r) => [
      documentTypeUiLabels[r.type],
      r.numero ?? "",
      r.clientName.replace(/"/g, "'"),
      r.dateEmission ?? "",
      r.totalTtc.toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rascunhos-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <BillingNav active="" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Rascunhos</h1>
              <p className="mt-1 text-sm text-muted">
                Documentos ainda não emitidos. Enquanto estão em rascunho, podem ser editados livremente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={visibleRows.length === 0} onClick={exportCsv} type="button" variant="secondary">
                Exportar CSV
              </Button>
              <Link href="/documentos/novo?type=facture">
                <Button type="button">+ Nova fatura</Button>
              </Link>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {kpis.map((k) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filtros de tipo */}
          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                aria-pressed={filter === f.key}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.key
                    ? "bg-brand text-white"
                    : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                }`}
                key={f.key}
                onClick={() => setFilter(f.key)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabela / empty */}
          {visibleRows.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhum rascunho neste filtro.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Comece um documento novo e ele fica aqui até ser emitido.
              </p>
              <Link className="mt-6" href="/documentos/novo?type=facture">
                <Button type="button">Criar fatura</Button>
              </Link>
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Documentos em rascunho</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {visibleRows.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Tipo</th>
                      <th className="px-5 py-2.5">Cliente</th>
                      <th className="px-5 py-2.5">Data de emissão</th>
                      <th className="px-5 py-2.5 text-right">Total TTC</th>
                      <th className="px-5 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => (
                      <tr className="border-b border-line last:border-b-0" key={r.id}>
                        <td className="px-5 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${typeBadges[r.type]}`}
                          >
                            {documentTypeUiLabels[r.type]}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 font-medium text-ink">{r.clientName}</td>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.dateEmission || "—"}</td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                          {euro.format(r.totalTtc)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <Link
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                            href={`/documentos/${r.id}/editar`}
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            Rascunho não tem número definitivo nem valor legal. O número é atribuído na emissão.
          </p>
        </div>
      </div>
    </main>
  );
}
