"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityCategory, DocumentType } from "@/lib/types";
import { categoryLabels, documentTypeUiLabels } from "@/lib/types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const qty = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export type LineRow = {
  id: string;
  documentId: string;
  numero: string | null;
  type: DocumentType;
  clientName: string;
  dateEmission: string | null;
  designation: string;
  description: string | null;
  categorie: ActivityCategory;
  quantite: number;
  prixUnitaireHt: number;
  tauxTva: number;
  totalLigneHt: number;
  ordre: number;
};

type TypeFilter = "todos" | DocumentType;

const filters: { key: TypeFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "devis", label: "Orçamentos" },
  { key: "facture", label: "Faturas" },
  { key: "avoir", label: "Notas de crédito" }
];

const typeBadges: Record<DocumentType, string> = {
  devis: "bg-sky-50 text-sky-700 ring-sky-200",
  facture: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  avoir: "bg-amber-50 text-amber-700 ring-amber-200"
};

export function LinhasClient({ rows }: { rows: LineRow[] }) {
  const [filter, setFilter] = useState<TypeFilter>("todos");
  const [search, setSearch] = useState("");

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "todos" && r.type !== filter) return false;
      if (!term) return true;
      return r.designation.toLowerCase().includes(term);
    });
  }, [rows, filter, search]);

  const totalHt = visibleRows.reduce((sum, r) => sum + r.totalLigneHt, 0);

  const kpis = [
    { label: "Linhas", value: String(visibleRows.length), tone: "text-ink" },
    { label: "Total HT", value: euro.format(totalHt), tone: "text-ink" }
  ];

  function exportCsv() {
    const header = [
      "Documento",
      "Tipo",
      "Cliente",
      "Data de emissão",
      "Designação",
      "Categoria",
      "Quantidade",
      "Preço unitário HT",
      "Taxa TVA",
      "Total linha HT"
    ];
    const body = visibleRows.map((r) => [
      r.numero ?? "",
      documentTypeUiLabels[r.type],
      r.clientName.replace(/"/g, "'"),
      r.dateEmission ?? "",
      r.designation.replace(/"/g, "'"),
      categoryLabels[r.categorie] ?? r.categorie,
      String(r.quantite),
      r.prixUnitaireHt.toFixed(2),
      `${r.tauxTva}%`,
      r.totalLigneHt.toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linhas-${filter}.csv`;
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
              <h1 className="text-2xl font-semibold text-ink">Linhas de documentos</h1>
              <p className="mt-1 text-sm text-muted">
                Cada item faturado, com o documento e o cliente de origem. Útil para ver o que mais vende.
              </p>
            </div>
            <Button disabled={visibleRows.length === 0} onClick={exportCsv} type="button" variant="secondary">
              Exportar CSV
            </Button>
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

          {/* Filtros */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
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
            <Input
              aria-label="Buscar por designação"
              className="w-full sm:w-72"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na designação"
              type="search"
              value={search}
            />
          </div>

          {/* Tabela / empty */}
          {visibleRows.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhuma linha encontrada.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Ajuste o filtro ou a busca para ver outros itens.
              </p>
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Itens faturados</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {visibleRows.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Documento</th>
                      <th className="px-5 py-2.5">Tipo</th>
                      <th className="px-5 py-2.5">Cliente</th>
                      <th className="px-5 py-2.5">Emissão</th>
                      <th className="px-5 py-2.5">Designação</th>
                      <th className="px-5 py-2.5">Categoria</th>
                      <th className="px-5 py-2.5 text-right">Qtd.</th>
                      <th className="px-5 py-2.5 text-right">Preço unit. HT</th>
                      <th className="px-5 py-2.5 text-right">TVA</th>
                      <th className="px-5 py-2.5 text-right">Total linha HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => (
                      <tr className="border-b border-line last:border-b-0" key={r.id}>
                        <td className="px-5 py-2.5 font-medium text-ink">
                          <Link className="hover:underline" href={`/documentos/${r.documentId}`}>
                            {r.numero || "Rascunho"}
                          </Link>
                        </td>
                        <td className="px-5 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${typeBadges[r.type]}`}
                          >
                            {documentTypeUiLabels[r.type]}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-600">{r.clientName}</td>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.dateEmission || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{r.designation || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-500">{categoryLabels[r.categorie] ?? r.categorie}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{qty.format(r.quantite)}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">
                          {euro.format(r.prixUnitaireHt)}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{`${r.tauxTva}%`}</td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                          {euro.format(r.totalLigneHt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            Os valores são HT (sem TVA). Notas de crédito aparecem com o sinal do próprio documento, confira antes de
            somar tudo.
          </p>
        </div>
      </div>
    </main>
  );
}
