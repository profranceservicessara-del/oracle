"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

export type ReceitaRow = { date: string; numero: string; clientName: string; montant: number };
export type FaturaRow = { id: string; numero: string; date: string; status: string; total: number; aberto: number; hasPdf: boolean };
export type DespesaRow = { date: string; fournisseur: string; designation: string; montant: number };

type PeriodKey = "annee" | "trimestre" | "mois";

function periodBounds(key: PeriodKey): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "mois") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)), label: "Mês atual" };
  if (key === "trimestre") {
    const q = Math.floor(m / 3);
    return { start: iso(new Date(y, q * 3, 1)), end: iso(new Date(y, q * 3 + 3, 0)), label: "Trimestre atual" };
  }
  return { start: `${y}-01-01`, end: `${y}-12-31`, label: "Ano atual" };
}

const statusLabels: Record<string, string> = {
  sent: "Enviada",
  paid: "Paga",
  partial: "Parcial",
  cancelled: "Cancelada",
  expired: "Expirada",
  accepted: "Aceita",
  refused: "Recusada"
};

const CHECKLIST = [
  "Conferir receitas recebidas",
  "Conferir faturas emitidas",
  "Conferir faturas em aberto",
  "Revisar despesas e comprovantes",
  "Exportar dados de apoio",
  "Acessar o portal oficial correspondente"
];

export function DeclaracoesFiscaisClient({
  receitas,
  faturas,
  despesas
}: {
  receitas: ReceitaRow[];
  faturas: FaturaRow[];
  despesas: DespesaRow[];
}) {
  const [period, setPeriod] = useState<PeriodKey>("annee");
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));
  const bounds = useMemo(() => periodBounds(period), [period]);

  const { start, end } = bounds;
  const receitasP = useMemo(() => receitas.filter((r) => r.date >= start && r.date <= end), [receitas, start, end]);
  const faturasP = useMemo(() => faturas.filter((f) => Boolean(f.date) && f.date >= start && f.date <= end), [faturas, start, end]);
  const despesasP = useMemo(() => despesas.filter((d) => d.date >= start && d.date <= end), [despesas, start, end]);

  const totalReceitas = receitasP.reduce((s, r) => s + r.montant, 0);
  const totalEmitidas = faturasP.length;
  const totalAberto = faturasP.reduce((s, f) => s + f.aberto, 0);
  const totalDespesas = despesasP.reduce((s, d) => s + d.montant, 0);
  const comprovantes = faturasP.filter((f) => f.hasPdf).length;

  const isEmpty = receitasP.length === 0 && faturasP.length === 0 && despesasP.length === 0;

  const kpis = [
    { label: "Receitas recebidas", value: euro.format(totalReceitas), tone: "text-emerald-600" },
    { label: "Faturas emitidas", value: String(totalEmitidas), tone: "text-ink" },
    { label: "Faturas em aberto", value: euro.format(totalAberto), tone: "text-sky-600" },
    { label: "Despesas registradas", value: euro.format(totalDespesas), tone: "text-rose-600" },
    { label: "Comprovantes disponíveis", value: String(comprovantes), tone: "text-ink" }
  ];

  function exportCsv() {
    const lines: string[][] = [["Seção", "Data", "Referência", "Detalhe", "Valor"]];
    receitasP.forEach((r) => lines.push(["Receita", r.date, r.numero, (r.clientName || "").replace(/"/g, "'"), r.montant.toFixed(2)]));
    faturasP.forEach((f) => lines.push(["Fatura", f.date, f.numero, statusLabels[f.status] ?? f.status, f.total.toFixed(2)]));
    despesasP.forEach((d) => lines.push(["Despesa", d.date, (d.fournisseur || "").replace(/"/g, "'"), (d.designation || "").replace(/"/g, "'"), d.montant.toFixed(2)]));
    const csv = lines.map((l) => l.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `declaracoes-apoio-${bounds.start}_${bounds.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contabilidade</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Declarações fiscais</h1>
          <p className="mt-1 text-sm text-muted">Prepare e confira seus dados antes das declarações oficiais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Período" className="w-44" onChange={(e) => setPeriod(e.target.value as PeriodKey)} value={period}>
            <option value="annee">Ano atual</option>
            <option value="trimestre">Trimestre atual</option>
            <option value="mois">Mês atual</option>
          </Select>
          <Button disabled={isEmpty} onClick={exportCsv} type="button" variant="secondary">
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        Este módulo ajuda na preparação das informações. Ele não substitui as orientações oficiais da administração fiscal, URSSAF ou contador.
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {isEmpty ? (
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhuma informação fiscal encontrada para este período.</p>
          <p className="mt-2 max-w-md text-sm text-muted">Registre receitas, faturas e despesas para prepará-las aqui.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href="/financeiro">Ver financeiro</Link>
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href="/facturation">Ver faturas</Link>
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href="/comprovantes">Ver comprovantes</Link>
          </div>
        </div>
      ) : (
        <>
          <Section title="Receitas do período" count={receitasP.length} link="/financeiro">
            {receitasP.length === 0 ? (
              <EmptyRow text="Nenhuma receita neste período." />
            ) : (
              <Table headers={["Data", "Cliente", "Referência", "Valor"]}>
                {receitasP.slice(0, 50).map((r, i) => (
                  <tr className="border-b border-line last:border-b-0" key={`${r.numero}-${i}`}>
                    <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.date}</td>
                    <td className="px-5 py-2.5 text-ink">{r.clientName || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{r.numero}</td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(r.montant)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <Section title="Faturas emitidas" count={faturasP.length} link="/facturation">
            {faturasP.length === 0 ? (
              <EmptyRow text="Nenhuma fatura emitida neste período." />
            ) : (
              <Table headers={["Data", "Número", "Status", "Em aberto", "Total"]}>
                {faturasP.slice(0, 50).map((f) => (
                  <tr className="border-b border-line last:border-b-0" key={f.id}>
                    <td className="px-5 py-2.5 tabular-nums text-slate-600">{f.date || "—"}</td>
                    <td className="px-5 py-2.5 text-ink">{f.numero}</td>
                    <td className="px-5 py-2.5 text-slate-600">{statusLabels[f.status] ?? f.status}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-sky-600">{f.aberto > 0 ? euro.format(f.aberto) : "—"}</td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(f.total)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <Section title="Despesas / comprovantes" count={despesasP.length} link="/comprovantes">
            {despesasP.length === 0 ? (
              <EmptyRow text="Nenhuma despesa neste período." />
            ) : (
              <Table headers={["Data", "Fornecedor", "Descrição", "Valor"]}>
                {despesasP.slice(0, 50).map((d, i) => (
                  <tr className="border-b border-line last:border-b-0" key={`${d.date}-${i}`}>
                    <td className="px-5 py-2.5 tabular-nums text-slate-600">{d.date}</td>
                    <td className="px-5 py-2.5 text-ink">{d.fournisseur || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{d.designation || "—"}</td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(d.montant)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>
        </>
      )}

      {/* Checklist */}
      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Checklist de preparação</h2>
        </div>
        <ul className="divide-y divide-line">
          {CHECKLIST.map((item, i) => {
            const isPortal = i === CHECKLIST.length - 1;
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
                {isPortal ? (
                  <a className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href="https://www.impots.gouv.fr" rel="noopener noreferrer" target="_blank">
                    Portal oficial
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

function Section({ title, count, link, children }: { title: string; count: number; link: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{count}</span>
        </div>
        <Link className="text-sm font-medium text-brand hover:underline" href={link}>Abrir</Link>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full min-w-[560px] text-left text-sm">
      <thead>
        <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {headers.map((h, i) => (
            <th className={`px-5 py-2.5 ${i === headers.length - 1 ? "text-right" : ""}`} key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-5 py-6 text-center text-sm text-muted">{text}</p>;
}
