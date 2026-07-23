"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AgingResult, AgingRow } from "./aging-data";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

type Tab = "clientes" | "fornecedores";

const BUCKETS: { key: keyof Omit<AgingRow, "party">; label: string; tone: string }[] = [
  { key: "notDue", label: "A vencer", tone: "text-ink" },
  { key: "d1_30", label: "1 a 30 dias", tone: "text-amber-600" },
  { key: "d31_60", label: "31 a 60 dias", tone: "text-amber-700" },
  { key: "d61_90", label: "61 a 90 dias", tone: "text-orange-700" },
  { key: "d90plus", label: "Mais de 90 dias", tone: "text-rose-600" }
];

function toCsv(rows: AgingRow[]): string {
  const header = ["Terceiro", "A vencer", "1-30", "31-60", "61-90", "90+", "Total"];
  const body = rows.map((r) => [
    r.party.replace(/"/g, "'"),
    r.notDue.toFixed(2),
    r.d1_30.toFixed(2),
    r.d31_60.toFixed(2),
    r.d61_90.toFixed(2),
    r.d90plus.toFixed(2),
    r.total.toFixed(2)
  ]);
  return [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
}

function AgingView({ data, kind }: { data: AgingResult; kind: Tab }) {
  const overdueTotal = data.totals.d1_30 + data.totals.d31_60 + data.totals.d61_90 + data.totals.d90plus;
  const partyLabel = kind === "clientes" ? "Cliente" : "Fornecedor";
  const openLabel = kind === "clientes" ? "Total a receber" : "Total a pagar";

  function exportCsv() {
    const csv = toCsv(data.rows);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vencimentos-${kind}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6">
      {/* KPIs por faixa */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{openLabel}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{euro.format(data.totals.total)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vencido</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${overdueTotal > 0 ? "text-rose-600" : "text-ink"}`}>
            {euro.format(overdueTotal)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">A vencer</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{euro.format(data.totals.notDue)}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button disabled={data.rows.length === 0} onClick={exportCsv} type="button" variant="secondary">
          Exportar CSV
        </Button>
      </div>

      {data.rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nada em aberto.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            {kind === "clientes"
              ? "Não há faturas de venda com saldo a receber."
              : "Não há faturas de fornecedor com saldo a pagar."}
          </p>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Balance âgée por {partyLabel.toLowerCase()}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{data.rows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">{partyLabel}</th>
                  {BUCKETS.map((b) => (
                    <th className="px-5 py-2.5 text-right" key={b.key}>
                      {b.label}
                    </th>
                  ))}
                  <th className="px-5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr className="border-b border-line last:border-b-0" key={r.party}>
                    <td className="px-5 py-2.5 font-medium text-ink">{r.party}</td>
                    {BUCKETS.map((b) => (
                      <td className={`px-5 py-2.5 text-right tabular-nums ${r[b.key] > 0 ? b.tone : "text-slate-300"}`} key={b.key}>
                        {r[b.key] > 0 ? euro.format(r[b.key]) : "—"}
                      </td>
                    ))}
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-ink">{euro.format(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-slate-50 text-sm font-semibold">
                  <td className="px-5 py-2.5 text-ink">Total</td>
                  {BUCKETS.map((b) => (
                    <td className="px-5 py-2.5 text-right tabular-nums text-ink" key={b.key}>
                      {data.totals[b.key] > 0 ? euro.format(data.totals[b.key]) : "—"}
                    </td>
                  ))}
                  <td className="px-5 py-2.5 text-right tabular-nums text-ink">{euro.format(data.totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export function VencimentosClient({ clientAging, supplierAging }: { clientAging: AgingResult; supplierAging: AgingResult }) {
  const [tab, setTab] = useState<Tab>("clientes");
  const data = tab === "clientes" ? clientAging : supplierAging;
  const tabs = useMemo(
    () => [
      { key: "clientes" as const, label: "Clientes (a receber)" },
      { key: "fornecedores" as const, label: "Fornecedores (a pagar)" }
    ],
    []
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vencimentos</h1>
          <p className="mt-1 text-sm text-muted">Saldos em aberto por faixa de atraso (balance âgée), a receber e a pagar.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.key ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <AgingView data={data} kind={tab} />

      <p className="mt-4 text-xs text-muted">
        O atraso é calculado pela data de vencimento (ou de emissão, quando não há vencimento) em relação a hoje. Clientes vêm das{" "}
        <Link className="font-medium text-brand hover:underline" href="/facturation">faturas</Link>; fornecedores, das faturas recebidas e do módulo{" "}
        <Link className="font-medium text-brand hover:underline" href="/compras">Compras</Link>.
      </p>
    </main>
  );
}
