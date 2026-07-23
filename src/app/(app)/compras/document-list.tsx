"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DocumentEditor } from "./document-editor";
import {
  DOC_TYPE_META,
  STATUS_META,
  type AccountingCode,
  type PurchaseDocStatus,
  type PurchaseDocType,
  type PurchaseDocument,
  type SupplierOption
} from "./types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

type PeriodKey = "tudo" | "ano" | "mes";

function periodBounds(key: PeriodKey): { start: string; end: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "ano") return { start: `${y}-01-01`, end: `${y}-12-31` };
  if (key === "mes") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  return null;
}

// Status relevantes como pills de filtro (Todos + estados persistidos).
const STATUS_FILTERS: PurchaseDocStatus[] = [
  "draft",
  "to_verify",
  "validated",
  "partially_paid",
  "paid",
  "cancelled"
];

export function DocumentList({
  type,
  initialDocs,
  suppliers,
  accountingCodes,
  userId
}: {
  type: PurchaseDocType;
  initialDocs: PurchaseDocument[];
  suppliers: SupplierOption[];
  accountingCodes: AccountingCode[];
  userId: string;
}) {
  const router = useRouter();
  const meta = DOC_TYPE_META[type];
  const [statusFilter, setStatusFilter] = useState<"todos" | PurchaseDocStatus>("todos");
  const [period, setPeriod] = useState<PeriodKey>("tudo");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const supplierName = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  const bounds = useMemo(() => periodBounds(period), [period]);

  const rows = useMemo(() => {
    return initialDocs.filter((d) => {
      if (statusFilter !== "todos" && d.status !== statusFilter) return false;
      if (supplierFilter && d.third_id !== supplierFilter) return false;
      if (bounds && (d.document_date < bounds.start || d.document_date > bounds.end)) return false;
      return true;
    });
  }, [initialDocs, statusFilter, supplierFilter, bounds]);

  // KPIs sobre a base completa (não filtrada), padrão fournisseurs.
  const totalAPagar = initialDocs
    .filter((d) => d.status === "validated" || d.status === "partially_paid")
    .reduce((s, d) => s + (Number(d.total_incl_tax) || 0), 0);
  const totalPago = initialDocs
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + (Number(d.total_incl_tax) || 0), 0);
  const emAtraso = initialDocs.filter(
    (d) => d.due_date && d.due_date < today && d.status !== "paid" && d.status !== "cancelled"
  ).length;

  const kpis = [
    { label: `Total de ${meta.plural.toLowerCase()}`, value: String(initialDocs.length), tone: "text-ink" },
    { label: "Total a pagar", value: euro.format(totalAPagar), tone: "text-amber-600" },
    { label: "Total pago", value: euro.format(totalPago), tone: "text-emerald-600" },
    { label: "Em atraso", value: String(emAtraso), tone: emAtraso > 0 ? "text-rose-600" : "text-ink" }
  ];

  function openCreate() {
    setEditingId(null);
    setEditorOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setEditorOpen(true);
  }

  function exportCsv() {
    const header = ["Numero interno", "Numero externo", "Fornecedor", "Data", "Vencimento", "Status", "Total TTC"];
    const body = rows.map((d) => [
      d.internal_number ?? "",
      (d.external_number ?? "").replace(/"/g, "'"),
      (supplierName.get(d.third_id ?? "") ?? "").replace(/"/g, "'"),
      d.document_date,
      d.due_date ?? "",
      STATUS_META[d.status].label,
      (Number(d.total_incl_tax) || 0).toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filters: { key: "todos" | PurchaseDocStatus; label: string }[] = [
    { key: "todos", label: "Todos" },
    ...STATUS_FILTERS.map((s) => ({ key: s, label: STATUS_META[s].label }))
  ];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">{meta.plural}</h2>
          <p className="mt-1 text-sm text-muted">Documentos de compra do tipo {meta.singular.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={rows.length === 0} onClick={exportCsv} type="button" variant="secondary">
            Exportar CSV
          </Button>
          <Button onClick={openCreate} type="button">
            + Novo {meta.singular.toLowerCase()}
          </Button>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          Nenhum fornecedor cadastrado. Cadastre um fornecedor em{" "}
          <Link className="font-semibold underline" href="/contatos">
            Contatos
          </Link>{" "}
          para poder validar documentos.
        </div>
      ) : null}

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === f.key
                ? "bg-brand text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}
        <Select aria-label="Período" className="ml-auto w-40" onChange={(e) => setPeriod(e.target.value as PeriodKey)} value={period}>
          <option value="tudo">Tudo</option>
          <option value="ano">Este ano</option>
          <option value="mes">Este mês</option>
        </Select>
        <Select aria-label="Fornecedor" className="w-48" onChange={(e) => setSupplierFilter(e.target.value)} value={supplierFilter}>
          <option value="">Todos os fornecedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Tabela / empty */}
      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum documento neste filtro.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Crie um novo {meta.singular.toLowerCase()} ou ajuste os filtros para ver outros documentos.
          </p>
          <Button className="mt-6" onClick={openCreate} type="button">
            + Novo {meta.singular.toLowerCase()}
          </Button>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">{meta.plural}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{rows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Nº interno</th>
                  <th className="px-5 py-2.5">Fornecedor</th>
                  <th className="px-5 py-2.5">Data</th>
                  <th className="px-5 py-2.5">Vencimento</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const statusMeta = STATUS_META[d.status];
                  return (
                    <tr
                      className="cursor-pointer border-b border-line transition last:border-b-0 hover:bg-slate-50"
                      key={d.id}
                      onClick={() => openEdit(d.id)}
                    >
                      <td className="px-5 py-2.5 font-medium tabular-nums text-ink">{d.internal_number || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-600">{supplierName.get(d.third_id ?? "") || "—"}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600">{d.document_date}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600">{d.due_date || "—"}</td>
                      <td className="px-5 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(d.total_incl_tax) || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <DocumentEditor
        accountingCodes={accountingCodes}
        editingId={editingId}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={() => router.refresh()}
        suppliers={suppliers}
        type={type}
        userId={userId}
      />
    </div>
  );
}
