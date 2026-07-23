"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { DocumentType, PaymentMethod } from "@/lib/types";
import { documentTypeUiLabels, paymentMethodLabels } from "@/lib/types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

export type JournalEventKind = "emissao" | "pagamento";

export type JournalEvent = {
  id: string;
  kind: JournalEventKind;
  date: string;
  documentId: string;
  documentType: DocumentType | null;
  numero: string | null;
  clientName: string;
  moyen: PaymentMethod | null;
  amount: number;
};

type KindFilter = "todos" | JournalEventKind;
type PeriodKey = "tout" | "annee" | "mois";

const kindFilters: { key: KindFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "emissao", label: "Emissões" },
  { key: "pagamento", label: "Pagamentos" }
];

const kindMeta: Record<JournalEventKind, { label: string; badge: string; dot: string }> = {
  emissao: { label: "Emissão", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  pagamento: { label: "Pagamento", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" }
};

function periodBounds(key: PeriodKey): { start: string; end: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "annee") return { start: `${y}-01-01`, end: `${y}-12-31` };
  if (key === "mois") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  return null;
}

function eventLabel(event: JournalEvent): string {
  if (event.kind === "emissao") {
    const typeLabel = event.documentType ? documentTypeUiLabels[event.documentType] : "Documento";
    return `${typeLabel} ${event.numero ?? "sem número"} emitida para ${event.clientName}`;
  }
  const moyen = event.moyen ? paymentMethodLabels[event.moyen] : "meio não informado";
  return `Pagamento recebido de ${event.clientName} (${moyen})`;
}

export function DiarioClient({ events }: { events: JournalEvent[] }) {
  const [kind, setKind] = useState<KindFilter>("todos");
  const [period, setPeriod] = useState<PeriodKey>("annee");

  const visibleEvents = useMemo(() => {
    const bounds = periodBounds(period);
    return events.filter((e) => {
      if (kind !== "todos" && e.kind !== kind) return false;
      if (bounds && (e.date < bounds.start || e.date > bounds.end)) return false;
      return true;
    });
  }, [events, kind, period]);

  const totalEmitido = visibleEvents.filter((e) => e.kind === "emissao").reduce((s, e) => s + e.amount, 0);
  const totalRecebido = visibleEvents.filter((e) => e.kind === "pagamento").reduce((s, e) => s + e.amount, 0);

  const kpis = [
    { label: "Eventos", value: String(visibleEvents.length), tone: "text-ink" },
    { label: "Total emitido", value: euro.format(totalEmitido), tone: "text-sky-600" },
    { label: "Total recebido", value: euro.format(totalRecebido), tone: "text-emerald-600" }
  ];

  function exportCsv() {
    const header = ["Data", "Tipo de evento", "Descrição", "Documento", "Valor"];
    const body = visibleEvents.map((e) => [
      e.date,
      kindMeta[e.kind].label,
      eventLabel(e).replace(/"/g, "'"),
      e.numero ?? "",
      e.amount.toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diario-${period}-${kind}.csv`;
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
              <h1 className="text-2xl font-semibold text-ink">Diário de faturamento</h1>
              <p className="mt-1 text-sm text-muted">
                Linha do tempo com as emissões de documentos e os pagamentos recebidos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Período"
                className="w-40"
                onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                value={period}
              >
                <option value="annee">Este ano</option>
                <option value="mois">Este mês</option>
                <option value="tout">Tudo</option>
              </Select>
              <Button disabled={visibleEvents.length === 0} onClick={exportCsv} type="button" variant="secondary">
                Exportar CSV
              </Button>
            </div>
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

          {/* Filtros de evento */}
          <div className="mt-6 flex flex-wrap gap-2">
            {kindFilters.map((f) => (
              <button
                aria-pressed={kind === f.key}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  kind === f.key
                    ? "bg-brand text-white"
                    : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                }`}
                key={f.key}
                onClick={() => setKind(f.key)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Linha do tempo / empty */}
          {visibleEvents.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhum evento neste período.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Ajuste o período ou o tipo de evento para ver o histórico.
              </p>
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Eventos</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {visibleEvents.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-5 py-2.5">Evento</th>
                      <th className="px-5 py-2.5">Descrição</th>
                      <th className="px-5 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map((e) => {
                      const meta = kindMeta[e.kind];
                      return (
                        <tr className="border-b border-line last:border-b-0" key={e.id}>
                          <td className="px-5 py-2.5 tabular-nums text-slate-600">{e.date}</td>
                          <td className="px-5 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}
                            >
                              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-600">
                            <Link className="hover:underline" href={`/documentos/${e.documentId}`}>
                              {eventLabel(e)}
                            </Link>
                          </td>
                          <td
                            className={`px-5 py-2.5 text-right font-medium tabular-nums ${
                              e.kind === "pagamento" ? "text-emerald-600" : "text-ink"
                            }`}
                          >
                            {euro.format(e.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
            Este diário é reconstruído a partir dos documentos e pagamentos que existem hoje. Ele não é um registro de
            auditoria, então não mostra edições nem exclusões feitas no passado.
          </p>
        </div>
      </div>
    </main>
  );
}
