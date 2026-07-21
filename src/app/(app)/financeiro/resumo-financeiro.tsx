"use client";

import { useMemo } from "react";
import type { CashMovement } from "./financeiro-client";

// Resumo financeiro: gráfico dos últimos 7 dias + distribuição por método de
// pagamento. Componente autônomo, usado na aba Visão Geral. Opera sobre a
// lista de movimentos recebida (payments + purchases), sem dado inventado.

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const methodLabels: Record<string, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};
const weekdayShort = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ResumoFinanceiro({ movements }: { movements: CashMovement[] }) {
  const last7 = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      return { date: isoLocal(d), label: weekdayShort.format(d).replace(".", "").toUpperCase(), in: 0, out: 0 };
    });
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (const m of movements) {
      const d = byDate.get(m.date);
      if (!d) continue;
      if (m.kind === "in") d.in += m.amount;
      else d.out += m.amount;
    }
    return days;
  }, [movements]);
  const last7In = last7.reduce((s, d) => s + d.in, 0);
  const last7Out = last7.reduce((s, d) => s + d.out, 0);
  const last7Max = Math.max(1, ...last7.map((d) => Math.max(d.in, d.out)));

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const m of movements) {
      const k = m.method ?? "sem";
      map.set(k, (map.get(k) ?? 0) + m.amount);
      total += m.amount;
    }
    return [...map.entries()]
      .map(([key, value]) => ({ key, value, pct: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [movements]);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Resumo financeiro</p>
            <h3 className="text-sm font-semibold text-ink">Últimos 7 dias</h3>
          </div>
          <div className="flex gap-3 text-xs font-semibold tabular-nums">
            <span className="text-emerald-600">{euro.format(last7In)}</span>
            <span className="text-rose-600">{euro.format(last7Out)}</span>
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between gap-2">
          {last7.map((d) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={d.date}>
              <div className="flex h-24 w-full items-end justify-center gap-1">
                <span className="w-2.5 rounded-t bg-[#002D72]" style={{ height: `${(d.in / last7Max) * 100}%`, minHeight: "3px" }} />
                <span className="w-2.5 rounded-t bg-rose-400" style={{ height: `${(d.out / last7Max) * 100}%`, minHeight: "3px" }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="text-sm font-semibold text-ink">Método de pagamento</h3>
        {byMethod.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Sem movimentos registrados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {byMethod.map((m) => (
              <li key={m.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{methodLabels[m.key] ?? (m.key === "sem" ? "Sem método" : m.key)}</span>
                  <span className="tabular-nums text-slate-500">{m.pct.toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${m.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
