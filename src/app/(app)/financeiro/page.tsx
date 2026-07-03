"use client";

import { useState, type ReactNode } from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

// Financeiro / Fluxo de Caixa (Gestão). Frontend-only: não há schema financeiro
// no projeto, então os valores são placeholders seguros que espelham a
// referência. Botões (+Entrada, +Saída, Exportar CSV) sinalizam "em breve".

const eur = (n: number) => `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`;

type Tone = "blue" | "red" | "green" | "purple";
const toneStyles: Record<Tone, { card: string; dot: string; bar: string; value: string }> = {
  blue: { card: "from-[#EAF1FF] to-[#DCE8FF] ring-[#BcD3FF]", dot: "bg-[#2563EB]", bar: "bg-[#2563EB]/40", value: "text-[#0F2E6B]" },
  red: { card: "from-[#FFECEC] to-[#FFDede] ring-[#FFC7C7]", dot: "bg-[#E11D48]", bar: "bg-[#E11D48]/40", value: "text-[#7A1020]" },
  green: { card: "from-[#E6FAF0] to-[#D3F5E4] ring-[#B7EBD0]", dot: "bg-[#059669]", bar: "bg-[#059669]/40", value: "text-[#08432E]" },
  purple: { card: "from-[#F1ECFF] to-[#E7DEFF] ring-[#D5C6FF]", dot: "bg-[#7C3AED]", bar: "bg-[#7C3AED]/40", value: "text-[#3B1E7A]" }
};

function MetricCard({ tone, label, value, badge }: { tone: Tone; label: string; value: string; badge?: ReactNode }) {
  const s = toneStyles[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.card} p-4 shadow-sm ring-1`}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${s.value}`}>{value}</p>
      <div className="mt-2 min-h-[22px]">{badge}</div>
      <div className={`mt-3 h-1 rounded-full ${s.bar}`} />
    </div>
  );
}

function TrendBadge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "slate" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      {children}
    </span>
  );
}

const receivables = [
  { name: "Aurelys", date: "26/06/2026", via: "Transferência", amount: 100 },
  { name: "Jean Louis", date: "26/06/2026", via: "Transferência", amount: 100 }
];

const cashRows = [
  { name: "Aurelys", date: "26/06/2026", type: "Repasse Vendedor", status: "Pendente", amount: 100 },
  { name: "Jean Louis", date: "26/06/2026", type: "Repasse Vendedor", status: "Pendente", amount: 100 },
  { name: "Raquel Aparecida", date: "19/06/2026", type: "Repasse Vendedor", status: "Pago", amount: 50 },
  { name: "Gleicy Kelly", date: "19/06/2026", type: "Repasse Vendedor", status: "Em haver", amount: 115 }
];

const statusStyles: Record<string, string> = {
  Pendente: "bg-amber-100 text-amber-700",
  Pago: "bg-emerald-100 text-emerald-700",
  "Em haver": "bg-amber-100 text-amber-700"
};

export default function FinanceiroPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"geral" | "fluxo">("geral");
  const [period, setPeriod] = useState("mes");
  const [view, setView] = useState("diario");

  function soon() {
    showToast("Disponível em breve.", "info");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[#0F2E6B]">Financeiro</h1>
          <p className="mt-1 text-sm text-muted">Acompanhe entradas, saídas, saldo, recebíveis e resultados por produto ou serviço.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50" onClick={soon} type="button">
            <span className="text-base leading-none">+</span> Entrada
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50" onClick={soon} type="button">
            <span className="text-base leading-none">+</span> Saída
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
        {([["geral", "Visão Geral"], ["fluxo", "Fluxo de Caixa"]] as const).map(([key, label]) => (
          <button
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === key ? "bg-[#EEF3FF] text-[#0F2E6B] shadow-sm ring-1 ring-[#D7E2FF]" : "text-slate-500 hover:bg-slate-50"}`}
            key={key}
            onClick={() => setTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "geral" ? <VisaoGeral /> : <FluxoDeCaixa onExport={soon} period={period} setPeriod={setPeriod} setView={setView} view={view} />}
    </main>
  );
}

function VisaoGeral() {
  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#020D2C] via-[#0A2352] to-[#1E1F5B] px-6 py-6 shadow-[0_22px_55px_-26px_rgba(2,10,35,0.85)] ring-1 ring-inset ring-white/12">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-80 w-80 rounded-full bg-[#4F6BE0]/25 blur-[80px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-[#5B3FA0]/20 blur-[90px]" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Saldo atual
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white sm:text-4xl">{eur(1250)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">📅 2026-06</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20">● Tudo em dia</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Lucro real ProFrance</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-300 sm:text-3xl">{eur(295)}</p>
            <p className="mt-1 text-xs text-white/50">Receita − Despesas − Comissões</p>
          </div>
        </div>
      </section>

      {/* 4 metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard badge={<TrendBadge>▲ +7% mês anterior</TrendBadge>} label="Entradas do mês" tone="blue" value={eur(1250)} />
        <MetricCard badge={<TrendBadge tone="slate">→ 0% vs mês anterior</TrendBadge>} label="Saídas do mês" tone="red" value={eur(0)} />
        <MetricCard badge={<TrendBadge>▲ +7% mês anterior</TrendBadge>} label="Saldo atual" tone="green" value={eur(1250)} />
        <MetricCard label="Lucro estimado" tone="purple" value={eur(1250)} />
      </div>

      {/* Últimos 7 dias strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">📅 Últimos 7 dias</span>
          <span className="text-slate-500">Receita <span className="font-bold text-[#2563EB]">{eur(0)}</span></span>
          <span className="text-slate-500">Saídas <span className="font-bold text-rose-500">{eur(0)}</span></span>
          <span className="text-slate-500">Lucro <span className="font-bold text-emerald-600">{eur(0)}</span></span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-600 shadow-sm ring-1 ring-emerald-200">✅ Tudo em dia</span>
      </div>

      {/* DRE + right column */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">🧮</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">DRE mensal</p>
                <p className="text-xs text-muted">Resultado real após comissões</p>
              </div>
            </div>
            <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-black/5">2026-06</span>
          </div>
          <dl className="divide-y divide-line px-5 text-sm">
            <Row label="Receita" value={`+ ${eur(1250)}`} valueClass="text-emerald-600" />
            <Row label="Despesas" value={`− ${eur(0)}`} valueClass="text-rose-500" />
            <Row label="Comissões vendedor" value={`− ${eur(955)}`} valueClass="text-rose-500" />
          </dl>
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-transparent px-5 py-4">
            <span className="inline-flex items-center gap-2 font-semibold text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">✓</span>
              Lucro real ProFrance
            </span>
            <span className="text-xl font-bold tabular-nums text-emerald-600">{eur(295)}</span>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">📊</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Projeção próximos 7 dias</p>
              <p className="mt-0.5 text-sm text-muted">Sem entradas previstas nos próximos 7 dias.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Top categorias</span>
            <span className="ml-1 text-slate-500">🧾 Pedido</span>
            <span className="font-bold text-[#2563EB]">100%</span>
          </div>
        </div>
      </div>

      {/* A receber */}
      <ListCard badge="2 Financeiro" badgeTone="blue" title="A receber">
        {receivables.map((r) => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50/60 p-4 ring-1 ring-black/5" key={r.name}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">🤝</span>
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-muted">{r.date} · {r.via}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-[#2563EB] ring-1 ring-[#2563EB]/30">Serviço</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Pendente</span>
            </div>
            <div className="flex w-full items-center justify-between sm:w-auto sm:gap-8">
              <span className="font-bold tabular-nums text-emerald-600">+{eur(r.amount)}</span>
              <span className="text-sm font-medium text-slate-500">Entrada</span>
            </div>
          </div>
        ))}
      </ListCard>

      {/* A pagar */}
      <ListCard badge="0 Financeiro" badgeTone="amber" title="A pagar">
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Nenhuma saída pendente.</p>
      </ListCard>

      {/* Método de pagamento */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="mb-4 font-semibold text-ink">Financeiro — Método de pagamento</p>
        <div className="space-y-3">
          {[["Pago", 93], ["Pendente", 0], ["Parcial", 0], ["Atrasado", 0]].map(([label, pct]) => (
            <div key={label as string}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold tabular-nums text-slate-500">{pct}.0%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FluxoDeCaixa({
  period,
  setPeriod,
  view,
  setView,
  onExport
}: {
  period: string;
  setPeriod: (v: string) => void;
  view: string;
  setView: (v: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Resumo financeiro</p>
          <h2 className="text-2xl font-semibold text-[#0F2E6B]">Fluxo de Caixa</h2>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50" onClick={onExport} type="button">
          ⬇ Exportar CSV
        </button>
      </div>

      {/* 3 large summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <BigStat label="Receita" tone="blue" value={eur(1250)} />
        <BigStat label="Saídas" tone="red" value={eur(0)} />
        <BigStat label="Saldo líquido" tone="green" value={eur(1250)} />
      </div>

      {/* Filters */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center gap-2">
          {[["semana", "Esta semana"], ["mes", "Este mês"], ["anterior", "Mês anterior"], ["3meses", "3 meses"]].map(([key, label]) => (
            <button
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${period === key ? "bg-[#0F2E6B] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              key={key}
              onClick={() => setPeriod(key)}
              type="button"
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-sm font-medium text-slate-500">01 de jun. – 30 de jun.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {[["diario", "Diário"], ["semanal", "Semanal"], ["mensal", "Mensal"]].map(([key, label]) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === key ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
                key={key}
                onClick={() => setView(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <Select aria-label="Categorias" className="w-auto" defaultValue="all">
            <option value="all">Todas as categorias</option>
          </Select>
          <Select aria-label="Status" className="w-auto" defaultValue="all">
            <option value="all">Todos os status</option>
          </Select>
          <Select aria-label="Tipos" className="w-auto" defaultValue="all">
            <option value="all">Todos os tipos</option>
          </Select>
        </div>
      </section>

      {/* Monthly grouped list */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50 px-5 py-3">
          <p className="font-semibold text-ink">junho de 2026</p>
          <div className="flex gap-4 text-sm font-semibold tabular-nums">
            <span className="text-emerald-600">+{eur(1250)}</span>
            <span className="text-rose-500">-{eur(0)}</span>
            <span className="text-ink">= {eur(1250)}</span>
          </div>
        </div>
        <div className="divide-y divide-line">
          {cashRows.map((row, i) => (
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm" key={`${row.name}-${i}`}>
              <div className="min-w-[150px] flex-1">
                <p className="font-semibold text-ink">{row.name}</p>
                <p className="text-xs text-muted">{row.date} · {row.type}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[row.status] ?? "bg-slate-100 text-slate-600"}`}>{row.status}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Não afeta caixa</span>
              <span className="ml-auto font-bold tabular-nums text-emerald-600">+{eur(row.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Transações recentes */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Transações recentes</p>
            <h3 className="text-lg font-semibold text-[#0F2E6B]">Histórico financeiro</h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">Fluxo de caixa</span>
        </div>
        <div className="space-y-3">
          {receivables.map((r) => (
            <div className="rounded-2xl bg-slate-50/60 p-4 ring-1 ring-black/5" key={r.name}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">🤝</span>
                  <div>
                    <p className="font-semibold text-ink">{r.name}</p>
                    <p className="text-xs text-muted">Serviço</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums text-emerald-600">+{eur(r.amount)}</p>
                  <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Em haver</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full px-2.5 py-0.5 font-semibold text-emerald-600 ring-1 ring-emerald-200">Entrada</span>
                <span className="rounded-full px-2.5 py-0.5 font-semibold text-[#7C3AED] ring-1 ring-[#7C3AED]/30">🤝 Serviço</span>
                <span className="text-muted">{r.date} · Transferência prevista</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-500">Auditoria · não afeta caixa</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}

function BigStat({ tone, label, value }: { tone: Tone; label: string; value: string }) {
  const s = toneStyles[tone];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${s.card} p-5 shadow-sm ring-1`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${s.value}`}>{value}</p>
    </div>
  );
}

function ListCard({ title, badge, badgeTone, children }: { title: string; badge: string; badgeTone: "blue" | "amber"; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[#0F2E6B]">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeTone === "blue" ? "bg-blue-50 text-[#2563EB]" : "bg-amber-50 text-amber-700"}`}>{badge}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
