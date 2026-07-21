"use client";

import { useMemo, useState } from "react";
import type { CashMovement } from "./financeiro-client";

// Aba Fluxo de Caixa (Fase 1): 3 KPIs, filtros de período/granularidade/tipo/
// método e lista agrupada com totais correndo por grupo. Opera sobre todos os
// movimentos reais (payments = entradas, purchases = saídas). Sem inventar
// comissão, repasse ou categoria: esses dados não existem no banco.

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const methodLabels: Record<string, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};

type Period = "semana" | "mes" | "mes_anterior" | "3meses";
type Granularity = "diario" | "semanal" | "mensal";
type TypeFilter = "todos" | "in" | "out";

const periodLabels: Record<Period, string> = {
  semana: "Esta semana",
  mes: "Este mês",
  mes_anterior: "Mês anterior",
  "3meses": "3 meses"
};
const granLabels: Record<Granularity, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal"
};

// Data local em YYYY-MM-DD (evita o off-by-one de toISOString em UTC).
function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

function rangeFor(period: Period): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "mes") return { start: isoLocal(new Date(y, m, 1)), end: isoLocal(new Date(y, m + 1, 0)) };
  if (period === "mes_anterior") return { start: isoLocal(new Date(y, m - 1, 1)), end: isoLocal(new Date(y, m, 0)) };
  if (period === "3meses") return { start: isoLocal(new Date(y, m - 2, 1)), end: isoLocal(new Date(y, m + 1, 0)) };
  const mon = mondayOf(now);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: isoLocal(mon), end: isoLocal(sun) };
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const fullDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

function groupKeyAndLabel(dateStr: string, gran: Granularity): { key: string; label: string } {
  const d = parseDate(dateStr);
  if (gran === "mensal") {
    return { key: dateStr.slice(0, 7), label: monthYear.format(d) };
  }
  if (gran === "semanal") {
    const mon = mondayOf(d);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { key: isoLocal(mon), label: `${dayMonth.format(mon)} a ${dayMonth.format(sun)}` };
  }
  return { key: dateStr, label: fullDay.format(d) };
}

type Group = { key: string; label: string; items: CashMovement[]; totalIn: number; totalOut: number };

export function FluxoDeCaixaTab({ movements }: { movements: CashMovement[] }) {
  const [period, setPeriod] = useState<Period>("mes");
  const [gran, setGran] = useState<Granularity>("mensal");
  const [type, setType] = useState<TypeFilter>("todos");
  const [method, setMethod] = useState<string>("todos");

  const { start, end } = useMemo(() => rangeFor(period), [period]);

  const methods = useMemo(() => {
    const set = new Set<string>();
    for (const m of movements) if (m.method) set.add(m.method);
    return [...set];
  }, [movements]);

  const filtered = useMemo(
    () =>
      movements.filter(
        (m) =>
          m.date >= start &&
          m.date <= end &&
          (type === "todos" || m.kind === type) &&
          (method === "todos" || m.method === method)
      ),
    [movements, start, end, type, method]
  );

  const receita = filtered.filter((m) => m.kind === "in").reduce((s, m) => s + m.amount, 0);
  const saidas = filtered.filter((m) => m.kind === "out").reduce((s, m) => s + m.amount, 0);
  const liquido = receita - saidas;

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const m of filtered) {
      const { key, label } = groupKeyAndLabel(m.date, gran);
      let g = map.get(key);
      if (!g) {
        g = { key, label, items: [], totalIn: 0, totalOut: 0 };
        map.set(key, g);
      }
      g.items.push(m);
      if (m.kind === "in") g.totalIn += m.amount;
      else g.totalOut += m.amount;
    }
    const arr = [...map.values()].sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
    for (const g of arr) g.items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return arr;
  }, [filtered, gran]);

  const rangeLabel = `${dayMonth.format(parseDate(start))} a ${dayMonth.format(parseDate(end))}`;

  function exportCsv() {
    const header = ["Data", "Tipo", "Descrição", "Método", "Valor"];
    const rows = filtered
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .map((m) => [
        m.date,
        m.kind === "in" ? "Entrada" : "Saída",
        m.label.replace(/"/g, "'"),
        m.method ? methodLabels[m.method] ?? m.method : "",
        (m.kind === "in" ? m.amount : -m.amount).toFixed(2)
      ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-de-caixa-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Cabeçalho da seção */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Resumo financeiro</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Fluxo de Caixa</h2>
        </div>
        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={exportCsv}
          type="button"
        >
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" /></svg>
          Exportar CSV
        </button>
      </div>

      {/* KPIs — fundo tingido + ícone em círculo, como o print */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-sky-50/70 p-5 ring-1 ring-inset ring-sky-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Receita</p>
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{euro.format(receita)}</p>
        </div>
        <div className="rounded-2xl bg-rose-50/70 p-5 ring-1 ring-inset ring-rose-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saídas</p>
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{euro.format(saidas)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50/70 p-5 ring-1 ring-inset ring-emerald-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M4 18V9M10 18V5M16 18v-6M4 21h16" /></svg>
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saldo líquido</p>
          </div>
          <p className={`mt-3 text-2xl font-bold tabular-nums ${liquido >= 0 ? "text-ink" : "text-rose-600"}`}>{euro.format(liquido)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${period === p ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                key={p}
                onClick={() => setPeriod(p)}
                type="button"
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted tabular-nums">{rangeLabel}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex gap-1.5">
            {(Object.keys(granLabels) as Granularity[]).map((g) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${gran === g ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                key={g}
                onClick={() => setGran(g)}
                type="button"
              >
                {granLabels[g]}
              </button>
            ))}
          </div>
          <select
            aria-label="Tipo"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-brand"
            onChange={(e) => setType(e.target.value as TypeFilter)}
            value={type}
          >
            <option value="todos">Todos os tipos</option>
            <option value="in">Entradas</option>
            <option value="out">Saídas</option>
          </select>
          <select
            aria-label="Método"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-brand"
            onChange={(e) => setMethod(e.target.value)}
            value={method}
          >
            <option value="todos">Todos os métodos</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {methodLabels[m] ?? m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista agrupada */}
      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum movimento no período.</p>
          <p className="mt-2 text-sm text-muted">Ajuste o período ou os filtros acima.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" key={g.key}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <h3 className="text-sm font-semibold capitalize text-ink">{g.label}</h3>
                <div className="flex gap-3 text-xs font-semibold tabular-nums">
                  <span className="text-sky-600">+{euro.format(g.totalIn)}</span>
                  <span className="text-rose-600">−{euro.format(g.totalOut)}</span>
                  <span className="text-emerald-600">= {euro.format(g.totalIn - g.totalOut)}</span>
                </div>
              </div>
              <div className="divide-y divide-line">
                {g.items.map((m) => (
                  <div className="flex items-center justify-between gap-3 px-5 py-3.5" key={m.id}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${m.kind === "in" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {m.kind === "in" ? "↑" : "↓"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{m.label}</p>
                        <p className="text-xs text-muted">
                          {m.date}
                          {m.method ? ` · ${methodLabels[m.method] ?? m.method}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 font-semibold tabular-nums ${m.kind === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                      {m.kind === "in" ? "+" : "−"}
                      {euro.format(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
