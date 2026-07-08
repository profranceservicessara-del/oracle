"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Purchase } from "@/lib/types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const methodLabels: Record<string, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};

type PeriodKey = "tout" | "annee" | "mois";

function periodBounds(key: PeriodKey): { start: string; end: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "annee") return { start: `${y}-01-01`, end: `${y}-12-31` };
  if (key === "mois") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  return null;
}

export function FournisseursClient({ initialPurchases }: { initialPurchases: Purchase[] }) {
  const [period, setPeriod] = useState<PeriodKey>("annee");

  const bounds = useMemo(() => periodBounds(period), [period]);

  const rows = useMemo(
    () =>
      bounds
        ? initialPurchases.filter((p) => p.date_achat >= bounds.start && p.date_achat <= bounds.end)
        : initialPurchases,
    [initialPurchases, bounds]
  );

  const total = rows.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const fournisseurs = new Set(rows.map((p) => (p.fournisseur || "").trim().toLowerCase()).filter(Boolean)).size;
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = initialPurchases
    .filter((p) => p.date_achat?.slice(0, 7) === monthPrefix)
    .reduce((s, p) => s + (Number(p.montant) || 0), 0);

  function exportCsv() {
    const header = ["Data", "Fornecedor", "Descrição", "Referência", "Método", "Valor"];
    const body = rows.map((p) => [
      p.date_achat,
      (p.fournisseur || "").replace(/"/g, "'"),
      (p.designation || "").replace(/"/g, "'"),
      p.reference_piece || "",
      methodLabels[p.moyen ?? ""] ?? p.moyen ?? "",
      (Number(p.montant) || 0).toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturas-recebidas-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: "Total de faturas", value: String(rows.length), tone: "text-ink" },
    { label: "Montante total", value: euro.format(total), tone: "text-rose-600" },
    { label: "Pago este mês", value: euro.format(thisMonth), tone: "text-ink" },
    { label: "Fornecedores", value: String(fournisseurs), tone: "text-ink" }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="fournisseurs" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Faturas recebidas</h1>
              <p className="mt-1 text-sm text-muted">Acompanhe as faturas de fornecedores e as despesas registradas.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label="Período" className="w-40" onChange={(e) => setPeriod(e.target.value as PeriodKey)} value={period}>
                <option value="annee">Este ano</option>
                <option value="mois">Este mês</option>
                <option value="tout">Tudo</option>
              </Select>
              <Button disabled={rows.length === 0} onClick={exportCsv} type="button" variant="secondary">
                Exportar CSV
              </Button>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94]"
                href="/registre-des-achats"
              >
                + Nova despesa
              </Link>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Tabela / empty */}
          {rows.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhuma fatura recebida neste período.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Registre as faturas dos seus fornecedores como despesas para acompanhá-las aqui e no fluxo de caixa.
              </p>
              <Link
                className="mt-6 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94]"
                href="/registre-des-achats"
              >
                Registrar uma despesa
              </Link>
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Faturas de fornecedores</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-5 py-2.5">Fornecedor</th>
                      <th className="px-5 py-2.5">Descrição</th>
                      <th className="px-5 py-2.5">Referência</th>
                      <th className="px-5 py-2.5">Método</th>
                      <th className="px-5 py-2.5">Status</th>
                      <th className="px-5 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr className="border-b border-line last:border-b-0" key={p.id}>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600">{p.date_achat}</td>
                        <td className="px-5 py-2.5 font-medium text-ink">{p.fournisseur || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{p.designation || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-500">{p.reference_piece || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{methodLabels[p.moyen ?? ""] ?? p.moyen ?? "—"}</td>
                        <td className="px-5 py-2.5">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">Paga</span>
                        </td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(p.montant) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            As despesas registradas aqui são as mesmas somadas como saídas no <Link className="font-medium text-brand hover:underline" href="/financeiro">fluxo de caixa</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
