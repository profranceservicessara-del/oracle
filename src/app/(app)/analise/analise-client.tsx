"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LivresNav } from "@/components/app/livres-nav";
import { Select } from "@/components/ui/select";
import type { BankRow, EntradaRow, SaidaRow } from "@/lib/analise-data";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

// Gráfico anual: barras CA (verde) × despesas (rosa) + linha de resultado.
// SVG puro — sem lib.
function AnnualChart({ ca, dep }: { ca: number[]; dep: number[] }) {
  const W = 720;
  const H = 220;
  const PADX = 16;
  const PADY = 18;
  const result = ca.map((v, i) => v - dep[i]);
  const maxVal = Math.max(...ca, ...dep, 1);
  const minRes = Math.min(...result, 0);
  const top = Math.max(maxVal, ...result, 1);
  const range = top - minRes || 1;
  const y = (v: number) => PADY + (H - 2 * PADY) * (1 - (v - minRes) / range);
  const zeroY = y(0);
  const slot = (W - 2 * PADX) / 12;
  const barW = Math.min(14, slot / 3);

  const line = result.map((v, i) => `${PADX + slot * i + slot / 2},${y(v)}`).join(" ");

  return (
    <svg className="w-full" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${W} ${H + 18}`}>
      <line stroke="#E2E8F0" strokeWidth="1" x1={PADX} x2={W - PADX} y1={zeroY} y2={zeroY} />
      {ca.map((v, i) => {
        const cx = PADX + slot * i + slot / 2;
        return (
          <g key={i}>
            <rect fill="#99E8DC" height={Math.max(0, zeroY - y(v))} rx="3" width={barW} x={cx - barW - 1} y={y(v)} />
            <rect fill="#F86A8B" height={Math.max(0, zeroY - y(dep[i]))} rx="3" width={barW} x={cx + 1} y={y(dep[i])} />
            <text fill="#94A3B8" fontSize="11" textAnchor="middle" x={cx} y={H + 12}>
              {MONTHS_SHORT[i]}
            </text>
          </g>
        );
      })}
      <polyline fill="none" points={line} stroke="#7C3AED" strokeWidth="1.5" />
      {result.map((v, i) => (
        <circle cx={PADX + slot * i + slot / 2} cy={y(v)} fill="#A78BFA" key={i} r="3.5" stroke="#7C3AED" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function MonthlyTable({ title, values, tone }: { title: string; values: number[]; tone: string }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <tbody>
            <tr>
              <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink">{title}</td>
              {values.map((v, i) => (
                <td className={`px-2 py-3 text-right tabular-nums ${v > 0 ? "text-ink" : "text-slate-400"}`} key={i}>
                  {Math.round(v)}
                </td>
              ))}
              <td className={`whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums ${tone}`}>{Math.round(sum(values))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AnaliseClient({
  entradas,
  saidas,
  bank,
  aReceber,
  periodicite,
  embedded = false
}: {
  entradas: EntradaRow[];
  saidas: SaidaRow[];
  bank: BankRow[];
  aReceber: number;
  periodicite: "mensal" | "trimestral";
  embedded?: boolean;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const years = useMemo(() => {
    const ys = new Set<number>([currentYear]);
    entradas.forEach((e) => ys.add(Number(e.date.slice(0, 4))));
    saidas.forEach((s) => ys.add(Number(s.date.slice(0, 4))));
    return [...ys].sort((a, b) => b - a);
  }, [entradas, saidas, currentYear]);
  const [year, setYear] = useState(currentYear);

  const caMensal = useMemo(() => {
    const t = Array(12).fill(0) as number[];
    entradas.forEach((e) => {
      if (Number(e.date.slice(0, 4)) === year) t[Number(e.date.slice(5, 7)) - 1] += e.montant;
    });
    return t;
  }, [entradas, year]);

  const depMensal = useMemo(() => {
    const t = Array(12).fill(0) as number[];
    saidas.forEach((s) => {
      if (Number(s.date.slice(0, 4)) === year) t[Number(s.date.slice(5, 7)) - 1] += s.montant;
    });
    return t;
  }, [saidas, year]);

  const caTotal = sum(caMensal);
  const depTotal = sum(depMensal);
  const resultado = caTotal - depTotal;

  // Despesas do ano agrupadas por fornecedor (top 6).
  const porFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    saidas.forEach((s) => {
      if (Number(s.date.slice(0, 4)) !== year) return;
      map.set(s.fournisseur, (map.get(s.fournisseur) ?? 0) + s.montant);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [saidas, year]);
  const maxFornecedor = Math.max(...porFornecedor.map(([, v]) => v), 1);

  // Tesouraria: saldo cumulativo derivado do extrato bancário IMPORTADO
  // (bank_transactions). Sem extrato => sem número inventado.
  const saldoBanco = useMemo(() => {
    if (bank.length === 0) return null;
    return sum(bank.map((t) => (t.direction === "credit" ? t.amount : -t.amount)));
  }, [bank]);

  // Base declarável do período corrente (mesma janela do motor /urssaf).
  const declBase = useMemo(() => {
    const m = currentMonth;
    let start: string;
    let end: string;
    let label: string;
    if (periodicite === "mensal") {
      start = `${currentYear}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, m + 1, 0).getDate();
      end = `${currentYear}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      label = `${MONTHS_SHORT[m]}/${currentYear}`;
    } else {
      const q = Math.floor(m / 3);
      start = `${currentYear}-${String(q * 3 + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, q * 3 + 3, 0).getDate();
      end = `${currentYear}-${String(q * 3 + 3).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      label = `T${q + 1} ${currentYear}`;
    }
    const total = sum(entradas.filter((e) => e.date >= start && e.date <= end).map((e) => e.montant));
    return { total, label };
  }, [entradas, periodicite, currentYear, currentMonth]);

  const yearSelect = (
    <Select aria-label="Ano" className="w-24" onChange={(e) => setYear(Number(e.target.value))} value={year}>
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </Select>
  );

  const cards = (
    <>
      {/* Gráfico anual */}
      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="grid shrink-0 grid-cols-3 gap-3 lg:flex lg:w-44 lg:flex-col lg:gap-6">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full bg-[#99E8DC]" /> Faturamento</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink lg:text-xl">{euro.format(caTotal)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full bg-[#F86A8B]" /> Despesas</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink lg:text-xl">{euro.format(depTotal)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full bg-[#A78BFA] ring-1 ring-inset ring-[#7C3AED]" /> Resultado</p>
              <p className={`mt-0.5 text-lg font-semibold tabular-nums lg:text-xl ${resultado >= 0 ? "text-ink" : "text-rose-600"}`}>{euro.format(resultado)}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <AnnualChart ca={caMensal} dep={depMensal} />
          </div>
        </div>
      </section>

      {/* Tabelas mensais */}
      <div className="mb-6 space-y-3">
        <MonthlyTable title="Faturamento" tone="text-emerald-600" values={caMensal} />
        <MonthlyTable title="Despesas" tone="text-rose-600" values={depMensal} />
      </div>

      {/* Despesas por fornecedor */}
      {porFornecedor.length > 0 ? (
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs text-muted">Despesas · {year}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink lg:text-xl">{euro.format(depTotal)}</p>
          <div className="mt-4 space-y-3">
            {porFornecedor.map(([nome, valor]) => (
              <div key={nome}>
                <p className="text-xs text-slate-600">{nome}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-3.5 rounded-full bg-[#F86A8B]" style={{ width: `${Math.max(3, (valor / maxFornecedor) * 100)}%` }} />
                  <span className="shrink-0 text-xs tabular-nums text-muted">{euro.format(valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Tesouraria */}
      <h2 className="mb-3 text-sm font-semibold text-ink">Tesouraria</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="text-xs text-muted">Saldo do extrato bancário</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
              {saldoBanco === null ? "—" : euro.format(saldoBanco)}
            </p>
            {saldoBanco === null ? (
              <p className="mt-1 text-xs text-muted">Conecte seu banco ou importe o extrato para acompanhar.</p>
            ) : null}
          </div>
          <Link className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50" href="/banco">
            Detalhe
          </Link>
        </div>
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="text-xs text-muted">Faturas aguardando pagamento</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-sky-600">{euro.format(aReceber)}</p>
          </div>
          <Link className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50" href="/facturation">
            Detalhe
          </Link>
        </div>
      </div>

      {/* Declaração */}
      <section className="rounded-2xl bg-gradient-to-br from-[#EAF1FF] to-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Declaração · {declBase.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{euro.format(declBase.total)}</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              Base declarável do período (valores realmente recebidos). O valor das contribuições é calculado pela URSSAF — nós preparamos a base e o Conselheiro pode fazer a declaração por você.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8]"
              href="/urssaf"
            >
              Declarar agora
            </Link>
            <Link className="text-center text-xs font-medium text-brand hover:underline" href="/conselheiro">
              Pedir ao Conselheiro (48h)
            </Link>
          </div>
        </div>
      </section>
    </>
  );

  if (embedded) {
    return (
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Gestão</p>
            <h2 className="mt-1 text-xl font-medium text-ink">Análise</h2>
          </div>
          {yearSelect}
        </div>
        {cards}
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Análise</h1>
          <p className="mt-1 text-sm text-muted">Faturamento, despesas e resultado do ano, com tesouraria e declaração num só lugar.</p>
        </div>
        {yearSelect}
      </div>

      <LivresNav active="resultados" />

      {cards}
    </main>
  );
}
