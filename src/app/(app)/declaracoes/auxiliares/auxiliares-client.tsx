"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/select";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

export type AuxRow = { date: string; montant: number; flag: boolean; pend: boolean };

type PeriodKey = "annee" | "trimestre" | "mois";

function periodBounds(key: PeriodKey): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "mois") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  if (key === "trimestre") {
    const q = Math.floor(m / 3);
    return { start: iso(new Date(y, q * 3, 1)), end: iso(new Date(y, q * 3 + 3, 0)) };
  }
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

function ArrowIcon() {
  return (
    <svg className="shrink-0 text-slate-300" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function AuxiliaresClient({
  receitas,
  faturas,
  despesas,
  faturasRecebidas
}: {
  receitas: AuxRow[];
  faturas: AuxRow[];
  despesas: AuxRow[];
  faturasRecebidas: AuxRow[];
}) {
  const [period, setPeriod] = useState<PeriodKey>("annee");
  const { start, end } = useMemo(() => periodBounds(period), [period]);

  const rec = useMemo(() => receitas.filter((r) => Boolean(r.date) && r.date >= start && r.date <= end), [receitas, start, end]);
  const fat = useMemo(() => faturas.filter((r) => Boolean(r.date) && r.date >= start && r.date <= end), [faturas, start, end]);
  const des = useMemo(() => despesas.filter((r) => Boolean(r.date) && r.date >= start && r.date <= end), [despesas, start, end]);
  const rec2 = useMemo(() => faturasRecebidas.filter((r) => Boolean(r.date) && r.date >= start && r.date <= end), [faturasRecebidas, start, end]);

  const sum = (rows: AuxRow[]) => rows.reduce((s, r) => s + r.montant, 0);
  const comprovantes = fat.filter((f) => f.flag).length + rec2.filter((r) => r.flag).length;
  const pendencias = fat.filter((f) => f.pend).length + rec2.filter((r) => r.pend).length;

  const cards = [
    { title: "Livro de receitas", value: euro.format(sum(rec)), sub: `${rec.length} recebimento(s)`, href: "/financeiro" },
    { title: "Comprovantes disponíveis", value: String(comprovantes), sub: "faturas e anexos com arquivo", href: "/comprovantes" },
    { title: "Faturas emitidas", value: String(fat.length), sub: euro.format(sum(fat)), href: "/documentos" },
    { title: "Despesas registradas", value: euro.format(sum(des)), sub: `${des.length} lançamento(s)`, href: "/facturation/fournisseurs" },
    { title: "Faturas recebidas", value: String(rec2.length), sub: euro.format(sum(rec2)), href: "/facturation/fournisseurs" },
    { title: "Pendências de conferência", value: String(pendencias), sub: "faturas em aberto e a pagar", href: "/declaracoes/fiscais", warn: pendencias > 0 }
  ];

  const links = [
    { label: "Ver declarações fiscais", href: "/declaracoes/fiscais" },
    { label: "Ver financeiro", href: "/financeiro" },
    { label: "Ver comprovantes", href: "/comprovantes" },
    { label: "Ver faturas recebidas", href: "/facturation/fournisseurs" },
    { label: "Ver documentos", href: "/documentos" }
  ];

  const isEmpty = rec.length === 0 && fat.length === 0 && des.length === 0 && rec2.length === 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contabilidade</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Declarações auxiliares</h1>
          <p className="mt-1 text-sm text-muted">Reúna relatórios e documentos de apoio para conferências e declarações.</p>
        </div>
        <Select aria-label="Período" className="w-44" onChange={(e) => setPeriod(e.target.value as PeriodKey)} value={period}>
          <option value="annee">Ano atual</option>
          <option value="trimestre">Trimestre atual</option>
          <option value="mois">Mês atual</option>
        </Select>
      </div>

      {/* Disclaimer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        Este módulo organiza informações auxiliares. Ele não substitui declarações oficiais, orientações fiscais ou o acompanhamento de um contador.
      </div>

      {isEmpty ? (
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhuma informação auxiliar encontrada para este período.</p>
          <p className="mt-2 max-w-md text-sm text-muted">Registre receitas, faturas e despesas para reuni-las aqui.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {links.map((l) => (
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href={l.href} key={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
              href={c.href}
              key={c.title}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.title}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${c.warn ? "text-amber-600" : "text-ink"}`}>{c.value}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{c.sub}</p>
              </div>
              <ArrowIcon />
            </Link>
          ))}
        </div>
      )}

      {/* Links de apoio */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Módulos relacionados</h2>
        </div>
        <ul className="divide-y divide-line">
          {links.map((l) => (
            <li key={l.href}>
              <Link className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-ink transition hover:bg-slate-50" href={l.href}>
                {l.label}
                <ArrowIcon />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
