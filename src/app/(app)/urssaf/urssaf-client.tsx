"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { RevenueBookRow } from "@/lib/accounting";
import {
  categoryLabels,
  type ActivityCategory,
  type DeclarationDraft,
  type DeclarationLine,
  type Profile
} from "@/lib/types";
import { formatSiret } from "@/lib/validation";
import { confirmDeclarationDraftAction, prepareDeclarationAction, setDeclarationLineStatusAction } from "./actions";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type ProfileSummary = Pick<Profile, "siret" | "activite_principale" | "declaration_periodicite" | "regime_tva" | "date_debut_activite">;

// Data local (não UTC): toISOString deslocaria o dia em fusos UTC+ (França),
// puxando recebimentos do dia anterior pra dentro do período fiscal.
function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Limites do período selecionado (mensal ou trimestral). Sem lógica fiscal —
// só recorte de calendário.
function periodBounds(year: number, index: number, periodicite: "mensal" | "trimestral") {
  if (periodicite === "mensal") {
    return { start: iso(new Date(year, index, 1)), end: iso(new Date(year, index + 1, 0)), label: `${MONTHS[index]} ${year}` };
  }
  return { start: iso(new Date(year, index * 3, 1)), end: iso(new Date(year, index * 3 + 3, 0)), label: `T${index + 1} ${year}` };
}

function fmtDate(isoDate: string) {
  const p = isoDate.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : isoDate;
}

const lineStatusMeta = {
  confirmed: { label: "Confirmado", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  needs_review: { label: "Revisar", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  excluded: { label: "Excluído", badge: "bg-slate-100 text-slate-500 ring-slate-200" }
} as const;

export function UrssafClient({
  initialRows,
  drafts,
  lines,
  profile
}: {
  initialRows: RevenueBookRow[];
  drafts: DeclarationDraft[];
  lines: DeclarationLine[];
  profile: ProfileSummary | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const periodicite: "mensal" | "trimestral" = profile?.declaration_periodicite === "mensal" ? "mensal" : "trimestral";
  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultIndex = periodicite === "mensal" ? now.getMonth() : Math.floor(now.getMonth() / 3);

  const years = useMemo(() => {
    const ys = new Set<number>([currentYear]);
    initialRows.forEach((r) => ys.add(Number(r.date.slice(0, 4))));
    drafts.forEach((d) => ys.add(Number(d.period_start.slice(0, 4))));
    return [...ys].sort((a, b) => b - a);
  }, [initialRows, drafts, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [periodIndex, setPeriodIndex] = useState(defaultIndex);

  const bounds = periodBounds(year, periodIndex, periodicite);

  const draft = drafts.find((d) => d.period_start === bounds.start && d.period_end === bounds.end) ?? null;
  const draftLines = useMemo(
    () => (draft ? lines.filter((l) => l.draft_id === draft.id) : []),
    [draft, lines]
  );

  // Pré-visualização (antes de preparar): recebimentos reais do período.
  const previewRows = useMemo(
    () => initialRows.filter((r) => r.date >= bounds.start && r.date <= bounds.end),
    [initialRows, bounds.start, bounds.end]
  );

  const confirmedLines = draftLines.filter((l) => l.status === "confirmed");
  const reviewLines = draftLines.filter((l) => l.status === "needs_review");
  const reviewable = confirmedLines.length + reviewLines.length;
  const confidence = reviewable === 0 ? 100 : Math.round((confirmedLines.length / reviewable) * 100);

  const totalConfirmed = confirmedLines.reduce((s, l) => s + (Number(l.montant) || 0), 0);

  const byCategory = useMemo(() => {
    const map = new Map<ActivityCategory, number>();
    const source = draft ? confirmedLines : previewRows;
    source.forEach((item) => {
      const cat = (item as DeclarationLine).categorie ?? (item as RevenueBookRow).category;
      if (!cat) return;
      map.set(cat as ActivityCategory, (map.get(cat as ActivityCategory) ?? 0) + (Number(item.montant) || 0));
    });
    return [...map.entries()];
  }, [draft, confirmedLines, previewRows]);

  // Gráfico anual (CSS puro): recebimentos por mês do ano selecionado.
  const monthly = useMemo(() => {
    const totals = Array(12).fill(0) as number[];
    initialRows.forEach((r) => {
      if (Number(r.date.slice(0, 4)) === year) totals[Number(r.date.slice(5, 7)) - 1] += Number(r.montant) || 0;
    });
    const max = Math.max(...totals, 1);
    return { totals, max };
  }, [initialRows, year]);

  const statusBadge = !draft
    ? { label: "Em preparação", cls: "bg-slate-100 text-slate-600 ring-slate-200" }
    : draft.status === "confirmed"
      ? { label: "Revisada", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
      : { label: "Pronta para revisar", cls: "bg-amber-50 text-amber-700 ring-amber-200" };

  const locked = draft?.status === "confirmed";

  function run(action: () => Promise<{ error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      showToast(successMsg, "success");
      router.refresh();
    });
  }

  function prepare() {
    run(
      () => prepareDeclarationAction(bounds.start, bounds.end, periodicite),
      draft ? "Base recalculada." : "Base preparada."
    );
  }

  function confirmDraft() {
    if (!draft) return;
    run(() => confirmDeclarationDraftAction(draft.id), "Base da declaração confirmada.");
  }

  function setLine(lineId: string, status: DeclarationLine["status"]) {
    run(() => setDeclarationLineStatusAction(lineId, status), "Linha atualizada.");
  }

  function exportCsv() {
    const source = draft ? draftLines : [];
    const header = ["Data", "Cliente", "Referência", "Categoria", "Fonte", "Status", "Motivo", "Valor"];
    const body = source.map((l) => [
      l.date_encaissement,
      (l.client_name ?? "").replace(/"/g, "'"),
      l.numero ?? "",
      l.categorie ? categoryLabels[l.categorie] : "—",
      l.moyen ?? "",
      lineStatusMeta[l.status].label,
      (l.reason ?? "").replace(/"/g, "'"),
      (Number(l.montant) || 0).toFixed(2)
    ]);
    body.push(["", "", "", "", "", "", "TOTAL CONFIRMADO", totalConfirmed.toFixed(2)]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `declaracao-urssaf-${bounds.start}_${bounds.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodOptions =
    periodicite === "mensal"
      ? MONTHS.map((m, i) => ({ value: i, label: m }))
      : [0, 1, 2, 3].map((i) => ({ value: i, label: `T${i + 1} (${MONTHS_SHORT[i * 3]}–${MONTHS_SHORT[i * 3 + 2]})` }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-ink">Declaração URSSAF</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusBadge.cls}`}>{statusBadge.label}</span>
          </div>
          <p className="mt-1 text-sm text-muted">Prepare sua declaração com base nos valores realmente recebidos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Ano" className="w-24" onChange={(e) => setYear(Number(e.target.value))} value={year}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select aria-label="Período" className="w-44" onChange={(e) => setPeriodIndex(Number(e.target.value))} value={periodIndex}>
            {periodOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Configuração */}
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
          <span className="text-slate-600"><span className="font-semibold text-ink">SIRET:</span> {profile?.siret ? formatSiret(profile.siret) : "não informado"}</span>
          <span className="text-slate-600"><span className="font-semibold text-ink">Categoria:</span> {profile?.activite_principale ? categoryLabels[profile.activite_principale] : "não definida"}</span>
          <span className="text-slate-600"><span className="font-semibold text-ink">Periodicidade:</span> {periodicite === "mensal" ? "Mensal" : "Trimestral"}</span>
          <span className="text-slate-600"><span className="font-semibold text-ink">TVA:</span> {profile?.regime_tva === "assujetti" ? "Sujeito a TVA" : "Franchise de TVA"}</span>
        </div>
        <Link className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href="/urssaf/configuracao">
          Configurar
        </Link>
      </section>

      {/* Disclaimer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        Esta ferramenta prepara uma base de declaração usando os dados registrados no Oracle. Revise os valores antes de qualquer envio oficial à URSSAF.
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{draft ? "Base confirmada" : "Recebido no período"}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">
            {euro.format(draft ? totalConfirmed : previewRows.reduce((s, r) => s + (Number(r.montant) || 0), 0))}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recebimentos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{draft ? confirmedLines.length : previewRows.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pendências</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${reviewLines.length > 0 ? "text-amber-600" : "text-ink"}`}>{draft ? reviewLines.length : "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Confiança</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${draft && confidence < 100 ? "text-amber-600" : "text-ink"}`}>{draft ? `${confidence}%` : "—"}</p>
        </div>
      </div>

      {/* Por categoria */}
      {byCategory.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {byCategory.map(([cat, total]) => (
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-black/5" key={cat}>
              {categoryLabels[cat]} · <span className="tabular-nums text-ink">{euro.format(total)}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* CTA principal */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
        <div className="min-w-0">
          <p className="font-medium text-ink">{bounds.label}</p>
          <p className="mt-0.5 text-xs text-muted">
            {locked
              ? `Base confirmada em ${draft?.confirmed_at ? fmtDate(draft.confirmed_at) : "—"} · registro travado.`
              : draft
                ? "Base preparada. Revise as entradas e confirme."
                : previewRows.length === 0
                  ? "Nenhum recebimento registrado neste período."
                  : `${previewRows.length} recebimento(s) encontrados para preparar.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked ? (
            <Button disabled={isPending || (previewRows.length === 0 && !draft)} onClick={prepare} type="button">
              {isPending ? "Calculando…" : draft ? "Recalcular" : "Preparar minha declaração"}
            </Button>
          ) : null}
          {draft && !locked ? (
            <Button disabled={isPending || reviewLines.length > 0} onClick={confirmDraft} type="button" variant="secondary">
              Confirmar base da declaração
            </Button>
          ) : null}
          {draft ? (
            <Button disabled={draftLines.length === 0} onClick={exportCsv} type="button" variant="secondary">
              Exportar resumo
            </Button>
          ) : null}
        </div>
      </section>

      {draft && reviewLines.length > 0 && !locked ? (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {reviewLines.length} item(ns) pendentes de revisão. Eles não entram na base automaticamente — inclua ou exclua cada um antes de confirmar.
        </div>
      ) : null}

      {/* Gráfico anual */}
      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-ink">Recebimentos por mês · {year}</h2>
        <div className="mt-4 flex items-end gap-1.5" style={{ height: 96 }}>
          {monthly.totals.map((total, i) => {
            const selected =
              periodicite === "mensal" ? i === periodIndex : Math.floor(i / 3) === periodIndex;
            return (
              <div className="flex flex-1 flex-col items-center gap-1" key={i} title={`${MONTHS[i]}: ${euro.format(total)}`}>
                <div
                  className={`w-full rounded-t transition ${selected ? "bg-brand" : "bg-slate-200"}`}
                  style={{ height: `${Math.max(4, Math.round((total / monthly.max) * 72))}px` }}
                />
                <span className={`text-[10px] ${selected ? "font-semibold text-brand" : "text-slate-400"}`}>{MONTHS_SHORT[i]}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Audit trail */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" id="entradas">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">{draft ? "Entradas da base" : "Recebimentos do período"}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
            {draft ? draftLines.length : previewRows.length}
          </span>
        </div>
        {(draft ? draftLines.length : previewRows.length) === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">Nenhum recebimento neste período.</p>
            <p className="mt-1 text-xs text-muted">Os recebimentos aparecem ao registrar pagamentos de faturas.</p>
            <Link className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" href="/facturation">
              Ver faturas
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Referência</th>
                  <th className="px-4 py-2.5">Categoria</th>
                  <th className="px-4 py-2.5">Fonte</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                  {draft && !locked ? <th className="px-4 py-2.5 text-right">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {draft
                  ? draftLines.map((l) => {
                      const meta = lineStatusMeta[l.status];
                      return (
                        <tr className="border-b border-line align-top last:border-b-0" key={l.id}>
                          <td className="px-4 py-2.5 tabular-nums text-slate-600">{fmtDate(l.date_encaissement)}</td>
                          <td className="px-4 py-2.5 text-ink">{l.client_name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {l.document_id ? (
                              <Link className="text-brand hover:underline" href={`/documentos/${l.document_id}`}>{l.numero ?? "Ver fatura"}</Link>
                            ) : (
                              l.numero ?? "—"
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{l.categorie ? categoryLabels[l.categorie] : "—"}</td>
                          <td className="px-4 py-2.5 text-slate-600">{l.moyen ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}>{meta.label}</span>
                            {l.reason ? <p className="mt-1 max-w-[220px] text-[11px] leading-4 text-muted">{l.reason}</p> : null}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(l.montant) || 0)}</td>
                          {!locked ? (
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {l.status === "needs_review" ? (
                                  <>
                                    {l.categorie ? (
                                      <button className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-50 disabled:opacity-50" disabled={isPending} onClick={() => setLine(l.id, "confirmed")} type="button">
                                        Incluir
                                      </button>
                                    ) : null}
                                    <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50" disabled={isPending} onClick={() => setLine(l.id, "excluded")} type="button">
                                      Excluir
                                    </button>
                                  </>
                                ) : (
                                  <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50" disabled={isPending} onClick={() => setLine(l.id, "needs_review")} type="button">
                                    Rever
                                  </button>
                                )}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  : previewRows.map((r) => (
                      <tr className="border-b border-line last:border-b-0" key={r.id}>
                        <td className="px-4 py-2.5 tabular-nums text-slate-600">{fmtDate(r.date)}</td>
                        <td className="px-4 py-2.5 text-ink">{r.clientName}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.numero}</td>
                        <td className="px-4 py-2.5 text-slate-600">{categoryLabels[r.category]}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.moyen ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">Aguardando preparação</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(r.montant) || 0)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
