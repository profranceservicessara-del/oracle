"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const INVOICE_BUCKET = "supplier-invoices";

export type Comprovante = {
  id: string;
  kind: "receita" | "despesa";
  date: string;
  label: string;
  sub: string;
  montant: number;
  source: "document" | "supplier_invoice";
  path: string | null;
};

type Filter = "todos" | "receita" | "despesa";

export function ComprovantesClient({ items }: { items: Comprovante[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>("todos");
  const [opening, setOpening] = useState<string | null>(null);

  const rows = useMemo(() => (filter === "todos" ? items : items.filter((i) => i.kind === filter)), [items, filter]);

  const receitas = items.filter((i) => i.kind === "receita").length;
  const despesas = items.filter((i) => i.kind === "despesa").length;

  async function open(item: Comprovante) {
    setOpening(item.id);
    try {
      if (item.source === "document") {
        // Comprovante de receita: link assinado gerado no servidor.
        const res = await fetch(`/api/documents/${item.id}/pdf`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.signedUrl) {
          showToast("Não foi possível abrir o comprovante.", "error");
          return;
        }
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      // Comprovante de despesa: anexo no bucket privado (RLS por dono).
      if (!item.path) return;
      const { data, error } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(item.path, 120);
      if (error || !data) {
        showToast("Não foi possível abrir o comprovante.", "error");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(null);
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "receita", label: "Receitas" },
    { key: "despesa", label: "Despesas" }
  ];

  const kpis = [
    { label: "Total de comprovantes", value: String(items.length), tone: "text-ink" },
    { label: "Receitas (faturas emitidas)", value: String(receitas), tone: "text-emerald-600" },
    { label: "Despesas (fornecedores)", value: String(despesas), tone: "text-rose-600" }
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contabilidade</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Comprovantes</h1>
        <p className="mt-1 text-sm text-muted">Todos os seus justificativos em um só lugar: faturas emitidas e anexos de fornecedores.</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.key ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
            key={f.key}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum comprovante ainda.</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Faturas emitidas e faturas de fornecedor com anexo aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Comprovantes</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{rows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Tipo</th>
                  <th className="px-5 py-2.5">Data</th>
                  <th className="px-5 py-2.5">Referência</th>
                  <th className="px-5 py-2.5 text-right">Valor</th>
                  <th className="px-5 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr className="border-b border-line last:border-b-0" key={`${item.source}-${item.id}`}>
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                          item.kind === "receita" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
                        }`}
                      >
                        {item.kind === "receita" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 tabular-nums text-slate-600">{item.date || "—"}</td>
                    <td className="px-5 py-2.5">
                      <span className="font-medium text-ink">{item.label}</span>
                      <span className="ml-2 text-xs text-muted">{item.sub}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(item.montant)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
                        disabled={opening === item.id}
                        onClick={() => void open(item)}
                        type="button"
                      >
                        {opening === item.id ? "Abrindo…" : "Abrir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mt-4 text-xs text-muted">Somente leitura. Os arquivos são gerenciados em Faturas (emitidas) e Faturas recebidas (fornecedores).</p>
    </main>
  );
}
