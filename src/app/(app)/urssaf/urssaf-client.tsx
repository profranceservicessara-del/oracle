"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { categoryLabels } from "@/lib/types";
import type { RevenueBookRow } from "@/lib/accounting";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const methodLabels: Record<string, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};

type PeriodKey = "mois" | "trimestre" | "annee";

// Limites do período a partir de hoje (simples, sem lógica fiscal complexa).
function periodBounds(key: PeriodKey): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "mois") {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)), label: "Mês atual" };
  }
  if (key === "trimestre") {
    const q = Math.floor(m / 3);
    return { start: iso(new Date(y, q * 3, 1)), end: iso(new Date(y, q * 3 + 3, 0)), label: "Trimestre atual" };
  }
  return { start: `${y}-01-01`, end: `${y}-12-31`, label: "Ano atual" };
}

const CHECKLIST = [
  "Conferir os recebimentos do período",
  "Conferir as faturas do período",
  "Controlar os montantes antes de declarar",
  "Exportar os dados preparatórios",
  "Conectar ao espaço oficial da URSSAF"
];

export function UrssafClient({ initialRows }: { initialRows: RevenueBookRow[] }) {
  const [period, setPeriod] = useState<PeriodKey>("trimestre");
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  const bounds = useMemo(() => periodBounds(period), [period]);

  const rows = useMemo(
    () => initialRows.filter((r) => r.date >= bounds.start && r.date <= bounds.end),
    [initialRows, bounds]
  );

  const total = rows.reduce((s, r) => s + (Number(r.montant) || 0), 0);
  const encaissements = new Set(rows.map((r) => r.id.replace(/-(vente|service_bic|service_bnc)$/, ""))).size;
  const factures = new Set(rows.map((r) => r.documentId)).size;

  function exportCsv() {
    const header = ["Data", "Cliente", "Referência", "Categoria", "Método", "Valor recebido"];
    const body = rows.map((r) => [
      r.date,
      (r.clientName || "").replace(/"/g, "'"),
      r.numero,
      categoryLabels[r.category],
      methodLabels[r.moyen] ?? r.moyen ?? "",
      (Number(r.montant) || 0).toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urssaf-preparacao-${bounds.start}_${bounds.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">URSSAF &amp; Declarações</h1>
          <p className="mt-1 text-sm text-muted">Prepara sua declaração a partir dos recebimentos registrados no Oracle.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Período" className="w-44" onChange={(e) => setPeriod(e.target.value as PeriodKey)} value={period}>
            <option value="mois">Mês atual</option>
            <option value="trimestre">Trimestre atual</option>
            <option value="annee">Ano atual</option>
          </Select>
          <Button disabled={rows.length === 0} onClick={exportCsv} type="button" variant="secondary">
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        Este módulo ajuda a preparar sua declaração. Não substitui as informações oficiais da URSSAF.
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Faturamento recebido</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">{euro.format(total)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nº de recebimentos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{encaissements}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Faturas associadas</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{factures}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Montante a verificar</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-sky-600">{euro.format(total)}</p>
        </div>
      </div>

      {/* Tabela */}
      {rows.length === 0 ? (
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum recebimento neste período.</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Os recebimentos aparecem aqui ao registrar pagamentos de faturas.</p>
          <Link className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8]" href="/facturation">
            Ver faturas
          </Link>
        </div>
      ) : (
        <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Recebimentos · {bounds.label}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{rows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Data</th>
                  <th className="px-5 py-2.5">Cliente</th>
                  <th className="px-5 py-2.5">Referência</th>
                  <th className="px-5 py-2.5">Categoria</th>
                  <th className="px-5 py-2.5">Método</th>
                  <th className="px-5 py-2.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr className="border-b border-line last:border-b-0" key={r.id}>
                    <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.date}</td>
                    <td className="px-5 py-2.5 text-ink">{r.clientName}</td>
                    <td className="px-5 py-2.5 text-slate-600">{r.numero}</td>
                    <td className="px-5 py-2.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{categoryLabels[r.category]}</span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{methodLabels[r.moyen] ?? r.moyen}</td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(r.montant) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Checklist */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Checklist antes de declarar</h2>
        </div>
        <ul className="divide-y divide-line">
          {CHECKLIST.map((item, i) => {
            const isUrssaf = i === CHECKLIST.length - 1;
            return (
              <li className="flex items-center justify-between gap-3 px-5 py-3" key={item}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    checked={checked[i]}
                    className="h-4 w-4 accent-[#1D4ED8]"
                    onChange={(e) => setChecked((cur) => cur.map((v, j) => (j === i ? e.target.checked : v)))}
                    type="checkbox"
                  />
                  <span className={checked[i] ? "text-slate-400 line-through" : "text-ink"}>{item}</span>
                </label>
                {isUrssaf ? (
                  <a
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                    href="https://www.autoentrepreneur.urssaf.fr"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Abrir URSSAF
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
