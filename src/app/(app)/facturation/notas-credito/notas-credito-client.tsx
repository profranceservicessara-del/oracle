"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createAvoirAction } from "@/app/(app)/documentos/actions";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

export type AvoirRow = {
  id: string;
  numero: string | null;
  clientName: string;
  dateEmission: string | null;
  totalTtc: number;
  factureOrigineNumero: string | null;
};

export type EligibleFacture = {
  id: string;
  numero: string | null;
  clientName: string;
  dateEmission: string | null;
  totalTtc: number;
};

export function NotasCreditoClient({ rows, eligibles }: { rows: AvoirRow[]; eligibles: EligibleFacture[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [factureId, setFactureId] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = rows.reduce((sum, r) => sum + r.totalTtc, 0);

  const kpis = [
    { label: "Notas de crédito", value: String(rows.length), tone: "text-ink" },
    { label: "Total TTC creditado", value: euro.format(total), tone: "text-amber-600" }
  ];

  function exportCsv() {
    const header = ["Número", "Cliente", "Data", "Total TTC", "Fatura de origem"];
    const body = rows.map((r) => [
      r.numero ?? "",
      r.clientName.replace(/"/g, "'"),
      r.dateEmission ?? "",
      r.totalTtc.toFixed(2),
      r.factureOrigineNumero ?? ""
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notas-credito.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function createAvoir() {
    if (!factureId) return;
    startTransition(async () => {
      const result = await createAvoirAction(factureId);
      if (result.error || !result.documentId) {
        showToast(result.error ?? "Não foi possível criar a nota de crédito.", "error");
        return;
      }
      showToast("Nota de crédito criada.", "success");
      setFactureId("");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <BillingNav active="" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Notas de crédito</h1>
              <p className="mt-1 text-sm text-muted">
                A nota de crédito (avoir) sempre nasce de uma fatura já emitida, nunca em branco.
              </p>
            </div>
            <Button disabled={rows.length === 0} onClick={exportCsv} type="button" variant="secondary">
              Exportar CSV
            </Button>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {kpis.map((k) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Criar nota de crédito */}
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-ink">Criar nota de crédito</h2>
            <p className="mt-1 text-sm text-muted">
              Escolha a fatura a creditar. O sistema gera a nota já vinculada a ela, com os mesmos itens.
            </p>
            {eligibles.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Nenhuma fatura elegível. Emita uma fatura primeiro em{" "}
                <Link className="font-medium text-brand hover:underline" href="/documentos/novo?type=facture">
                  nova fatura
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 text-sm font-medium text-ink">
                  Fatura de origem
                  <Select
                    className="mt-2"
                    disabled={isPending}
                    onChange={(e) => setFactureId(e.target.value)}
                    value={factureId}
                  >
                    <option value="">Selecione uma fatura</option>
                    {eligibles.map((f) => (
                      <option key={f.id} value={f.id}>
                        {`${f.numero ?? "Sem número"} · ${f.clientName} · ${euro.format(f.totalTtc)}`}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button disabled={!factureId || isPending} onClick={createAvoir} type="button">
                  {isPending ? "Criando..." : "Criar nota de crédito"}
                </Button>
              </div>
            )}
          </section>

          {/* Tabela / empty */}
          {rows.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhuma nota de crédito emitida.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Use o bloco acima para creditar uma fatura já emitida.
              </p>
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Notas emitidas</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {rows.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Número</th>
                      <th className="px-5 py-2.5">Cliente</th>
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-5 py-2.5">Fatura de origem</th>
                      <th className="px-5 py-2.5 text-right">Total TTC</th>
                      <th className="px-5 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr className="border-b border-line last:border-b-0" key={r.id}>
                        <td className="px-5 py-2.5 font-medium text-ink">{r.numero || "Rascunho"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{r.clientName}</td>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.dateEmission || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-500">{r.factureOrigineNumero || "—"}</td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                          {euro.format(r.totalTtc)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <Link
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                            href={`/documentos/${r.id}`}
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            A nota de crédito nasce como rascunho vinculado à fatura de origem. Revise os valores e emita para que ela
            receba número definitivo.
          </p>
        </div>
      </div>
    </main>
  );
}
