"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

export type OutstandingRow = {
  id: string;
  numero: string | null;
  clientName: string;
  dateEmission: string | null;
  dateEcheance: string | null;
  daysOverdue: number | null; // positivo = vencido, <= 0 = a vencer
  solde: number;
};

type Filter = "todos" | "a_vencer" | "vencidos";

const filters: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "a_vencer", label: "A vencer" },
  { key: "vencidos", label: "Vencidos" }
];

function isOverdue(row: OutstandingRow): boolean {
  return row.daysOverdue !== null && row.daysOverdue > 0;
}

// Texto da coluna "Dias de atraso": só conta atraso real, o resto é "a vencer".
function overdueLabel(row: OutstandingRow): string {
  if (row.daysOverdue === null) return "Sem vencimento";
  if (row.daysOverdue > 0) return `${row.daysOverdue} ${row.daysOverdue === 1 ? "dia" : "dias"}`;
  return "a vencer";
}

export function PrazosClient({ rows }: { rows: OutstandingRow[] }) {
  const [filter, setFilter] = useState<Filter>("todos");

  const visibleRows = useMemo(() => {
    if (filter === "vencidos") return rows.filter(isOverdue);
    if (filter === "a_vencer") return rows.filter((r) => !isOverdue(r));
    return rows;
  }, [rows, filter]);

  const totalAReceber = rows.reduce((sum, r) => sum + r.solde, 0);
  const overdueRows = rows.filter(isOverdue);
  const totalVencido = overdueRows.reduce((sum, r) => sum + r.solde, 0);

  const kpis = [
    { label: "Total a receber", value: euro.format(totalAReceber), tone: "text-ink" },
    { label: "Total vencido", value: euro.format(totalVencido), tone: totalVencido > 0 ? "text-rose-600" : "text-ink" },
    {
      label: "Faturas vencidas",
      value: String(overdueRows.length),
      tone: overdueRows.length > 0 ? "text-rose-600" : "text-ink"
    }
  ];

  function exportCsv() {
    const header = ["Número", "Cliente", "Emissão", "Vencimento", "Dias de atraso", "Saldo"];
    const body = visibleRows.map((r) => [
      r.numero ?? "",
      r.clientName.replace(/"/g, "'"),
      r.dateEmission ?? "",
      r.dateEcheance ?? "",
      r.daysOverdue !== null && r.daysOverdue > 0 ? String(r.daysOverdue) : overdueLabel(r),
      r.solde.toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prazos-${filter}.csv`;
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
              <h1 className="text-2xl font-semibold text-ink">Prazos</h1>
              <p className="mt-1 text-sm text-muted">
                Faturas com saldo em aberto, uma linha por documento, ordenadas por vencimento.
              </p>
            </div>
            <Button disabled={visibleRows.length === 0} onClick={exportCsv} type="button" variant="secondary">
              Exportar CSV
            </Button>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {kpis.map((k) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
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
              <p className="text-lg font-semibold text-ink">Nenhuma fatura em aberto neste filtro.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Faturas totalmente pagas, canceladas ou em rascunho não aparecem aqui.
              </p>
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Faturas em aberto</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {visibleRows.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Número</th>
                      <th className="px-5 py-2.5">Cliente</th>
                      <th className="px-5 py-2.5">Emissão</th>
                      <th className="px-5 py-2.5">Vencimento</th>
                      <th className="px-5 py-2.5">Dias de atraso</th>
                      <th className="px-5 py-2.5 text-right">Saldo</th>
                      <th className="px-5 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const overdue = isOverdue(r);
                      return (
                        <tr className="border-b border-line last:border-b-0" key={r.id}>
                          <td className="px-5 py-2.5 font-medium text-ink">{r.numero || "—"}</td>
                          <td className="px-5 py-2.5 text-slate-600">{r.clientName}</td>
                          <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.dateEmission || "—"}</td>
                          <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.dateEcheance || "—"}</td>
                          <td className="px-5 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                overdue
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-slate-100 text-slate-600 ring-slate-200"
                              }`}
                            >
                              {overdueLabel(r)}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-2.5 text-right font-medium tabular-nums ${
                              overdue ? "text-rose-600" : "text-ink"
                            }`}
                          >
                            {euro.format(r.solde)}
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <Link
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                              href={`/documentos/${r.id}`}
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            Esta é a visão por documento. A visão agregada por cliente, com faixas de atraso, fica em{" "}
            <Link className="font-medium text-brand hover:underline" href="/vencimentos">
              vencimentos
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
