"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { purchaseSchema } from "@/lib/validation";
import { FluxoDeCaixaTab } from "./fluxo-caixa-tab";

export type CashMovement = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: "in" | "out";
  label: string;
  method: string | null;
  amount: number;
};

export type Receivable = {
  id: string;
  numero: string | null;
  client: string | null;
  dueDate: string | null;
  amount: number;
  overdue: boolean;
};

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const methodLabels: Record<string, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};

const emptyForm = { date_achat: new Date().toISOString().slice(0, 10), fournisseur: "", designation: "", montant: "", moyen: "", reference_piece: "" };
const emptyEntrada = { document_id: "", montant: "", moyen: "virement", date_encaissement: new Date().toISOString().slice(0, 10) };

function yearsOf(movs: CashMovement[]): number[] {
  const set = new Set<number>();
  for (const m of movs) {
    const y = Number(m.date?.slice(0, 4));
    if (y) set.add(y);
  }
  set.add(new Date().getFullYear());
  return [...set].sort((a, b) => b - a);
}

export function FinanceiroClient({
  initialMovements,
  initialReceivables,
  userId
}: {
  initialMovements: CashMovement[];
  initialReceivables: Receivable[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [movements, setMovements] = useState(initialMovements);
  const years = useMemo(() => yearsOf(movements), [movements]);
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"geral" | "fluxo">("geral");
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [entradaForm, setEntradaForm] = useState(emptyEntrada);
  const [entradaErrors, setEntradaErrors] = useState<Record<string, string>>({});
  const [savingEntrada, setSavingEntrada] = useState(false);

  const visible = useMemo(
    () =>
      movements
        .filter((m) => m.date?.slice(0, 4) === String(year))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [movements, year]
  );

  const totalIn = visible.filter((m) => m.kind === "in").reduce((s, m) => s + m.amount, 0);
  const totalOut = visible.filter((m) => m.kind === "out").reduce((s, m) => s + m.amount, 0);
  const saldo = totalIn - totalOut; // saldo realizado (ano)

  // A receber = faturas emitidas não pagas (snapshot atual, não filtra por ano).
  const totalReceber = initialReceivables.reduce((s, r) => s + r.amount, 0);
  const saldoEstimado = saldo + totalReceber; // realizado + previsto
  const overdueCount = initialReceivables.filter((r) => r.overdue).length;

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function saveSaida() {
    // aceita vírgula decimal (pt-BR/fr) — z.coerce.number() precisa de ponto.
    const parsed = purchaseSchema.safeParse({ ...form, montant: form.montant.replace(",", ".") });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[i.path[0]?.toString() ?? "form"] = i.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { data, error } = await supabase
      .from("purchases")
      .insert({ ...parsed.data, user_id: userId })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível registrar a saída.", "error");
      return;
    }
    const row = data as { id: string; date_achat: string; montant: number; moyen: string | null; fournisseur: string; designation: string };
    setMovements((cur) => [
      {
        id: `out-${row.id}`,
        date: row.date_achat,
        kind: "out",
        label: [row.fournisseur, row.designation].filter(Boolean).join(" · ") || "Compra",
        method: row.moyen ?? null,
        amount: Number(row.montant) || 0
      },
      ...cur
    ]);
    setForm(emptyForm);
    setIsOpen(false);
    showToast("Saída registrada.", "success");
  }

  function setEnt<K extends keyof typeof emptyEntrada>(key: K, value: string) {
    setEntradaForm((c) => ({ ...c, [key]: value }));
  }

  // Entrada = recebimento de uma fatura em aberto (insere em payments, a fonte
  // real de caixa). Não usa manual_receipts, que é o livro de receitas e fica
  // fora do /financeiro de propósito (anti double-count com a base URSSAF).
  async function saveEntrada() {
    const next: Record<string, string> = {};
    if (!entradaForm.document_id) next.document_id = "Selecione a fatura recebida.";
    const montant = Number(entradaForm.montant.replace(",", "."));
    if (!montant || montant <= 0) next.montant = "Informe um valor maior que zero.";
    if (!entradaForm.date_encaissement) next.date_encaissement = "Informe a data.";
    if (Object.keys(next).length > 0) {
      setEntradaErrors(next);
      return;
    }
    setEntradaErrors({});
    setSavingEntrada(true);
    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        document_id: entradaForm.document_id,
        montant,
        moyen: entradaForm.moyen,
        date_encaissement: entradaForm.date_encaissement,
        notes: "Entrada registrada no Financeiro"
      })
      .select("id, date_encaissement, montant, moyen, documents(numero)")
      .single();
    setSavingEntrada(false);
    if (error || !data) {
      showToast("Não foi possível registrar a entrada.", "error");
      return;
    }
    const row = data as unknown as {
      id: string;
      date_encaissement: string;
      montant: number;
      moyen: string | null;
      documents: { numero: string | null } | { numero: string | null }[] | null;
    };
    const doc = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    setMovements((cur) => [
      {
        id: `in-${row.id}`,
        date: row.date_encaissement,
        kind: "in",
        label: doc?.numero ? `Recebimento · ${doc.numero}` : "Recebimento",
        method: row.moyen ?? null,
        amount: Number(row.montant) || 0
      },
      ...cur
    ]);
    setEntradaForm(emptyEntrada);
    setIsEntradaOpen(false);
    showToast("Entrada registrada.", "success");
  }

  function exportCsv() {
    const header = ["Data", "Tipo", "Descrição", "Método", "Valor"];
    const rows = visible.map((m) => [
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
    a.download = `fluxo-de-caixa-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Financeiro</h1>
          <p className="mt-1 text-sm text-muted">Acompanhe entradas, saídas, saldo, recebíveis e resultados por produto ou serviço.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-1 rounded-full border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98]"
            onClick={() => { setEntradaForm(emptyEntrada); setEntradaErrors({}); setIsEntradaOpen(true); }}
            type="button"
          >
            <span className="text-base leading-none">+</span> Entrada
          </button>
          <button
            className="inline-flex h-10 items-center gap-1 rounded-full border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 active:scale-[0.98]"
            onClick={() => { setForm(emptyForm); setErrors({}); setIsOpen(true); }}
            type="button"
          >
            <span className="text-base leading-none">+</span> Saída
          </button>
        </div>
      </div>

      {/* Abas — segmented control */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {(["geral", "fluxo"] as const).map((t) => (
          <button
            className={`rounded-xl py-2.5 text-sm font-semibold transition ${tab === t ? "bg-white text-ink shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-ink"}`}
            key={t}
            onClick={() => setTab(t)}
            type="button"
          >
            {t === "geral" ? "Visão Geral" : "Fluxo de Caixa"}
          </button>
        ))}
      </div>

      {tab === "fluxo" ? <FluxoDeCaixaTab movements={movements} /> : null}

      <div className={tab === "geral" ? "" : "hidden"}>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Select aria-label="Ano" className="w-28" onChange={(e) => setYear(Number(e.target.value))} value={year}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Button onClick={exportCsv} type="button" variant="secondary">
          Exportar CSV
        </Button>
      </div>

      {/* Hero — Saldo atual */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#071a3f] via-[#0b2350] to-[#1a2f5e] p-6 shadow-lg ring-1 ring-white/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Saldo atual
            </p>
            <p className={`mt-2 text-4xl font-bold tabular-nums ${saldo >= 0 ? "text-white" : "text-rose-300"}`}>{euro.format(saldo)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums text-white/80 ring-1 ring-inset ring-white/15">
                <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12"><rect height="16" rx="2" width="18" x="3" y="4" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
                {year}
              </span>
              {overdueCount === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Tudo em dia
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-400/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Saldo estimado</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${saldoEstimado >= 0 ? "text-white" : "text-rose-300"}`}>{euro.format(saldoEstimado)}</p>
            <p className="mt-1 text-xs text-white/40">Realizado + a receber</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recebidas ({year})</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">{euro.format(totalIn)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">A receber</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-sky-600">{euro.format(totalReceber)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saídas ({year})</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600">{euro.format(totalOut)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saldo estimado</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${saldoEstimado >= 0 ? "text-ink" : "text-rose-600"}`}>{euro.format(saldoEstimado)}</p>
          <p className="mt-0.5 text-[11px] text-muted">Realizado {euro.format(saldo)} + a receber</p>
        </div>
      </div>

      {initialReceivables.length > 0 ? (
        <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Contas a receber</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{initialReceivables.length}</span>
          </div>
          <ul className="divide-y divide-line">
            {initialReceivables.map((r) => (
              <li className="flex items-center justify-between gap-3 px-5 py-3 text-sm" key={r.id}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {r.numero ?? "Fatura"}
                    {r.client ? ` · ${r.client}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {r.dueDate ? `Vence ${r.dueDate}` : "Sem vencimento"}
                    {r.overdue ? (
                      <span className="ml-2 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">Atrasada</span>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-sky-600">{euro.format(r.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum movimento em {year}.</p>
          <p className="mt-2 text-sm text-muted">Recebimentos aparecem ao registrar pagamentos de faturas. Registre saídas com “+ Saída”.</p>
        </div>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {visible.map((m) => (
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
      )}
      </div>

      <FormModal description="Registre uma despesa/saída de caixa." isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova saída">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveSaida();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Data
              <Input className="mt-2" onChange={(e) => set("date_achat", e.target.value)} type="date" value={form.date_achat} />
              {errors.date_achat ? <span className="mt-1 block text-xs text-red-600">{errors.date_achat}</span> : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Valor (€)
              <Input className="mt-2" min="0" onChange={(e) => set("montant", e.target.value)} step="0.01" type="number" value={form.montant} />
              {errors.montant ? <span className="mt-1 block text-xs text-red-600">{errors.montant}</span> : null}
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Fornecedor
            <Input className="mt-2" onChange={(e) => set("fournisseur", e.target.value)} value={form.fournisseur} />
            {errors.fournisseur ? <span className="mt-1 block text-xs text-red-600">{errors.fournisseur}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Designação
            <Input className="mt-2" onChange={(e) => set("designation", e.target.value)} value={form.designation} />
            {errors.designation ? <span className="mt-1 block text-xs text-red-600">{errors.designation}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Método
            <Select className="mt-2" onChange={(e) => set("moyen", e.target.value)} value={form.moyen}>
              <option value="">—</option>
              <option value="virement">Transferência</option>
              <option value="cb">Cartão</option>
              <option value="especes">Dinheiro</option>
              <option value="cheque">Cheque</option>
              <option value="autre">Outro</option>
            </Select>
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Salvando…" : "Registrar saída"}
            </Button>
          </div>
        </form>
      </FormModal>

      <FormModal description="Registre o recebimento de uma fatura em aberto." isOpen={isEntradaOpen} onClose={() => setIsEntradaOpen(false)} title="Nova entrada">
        {initialReceivables.length === 0 ? (
          <div className="py-2 text-sm text-muted">
            Nenhuma fatura em aberto. As entradas do caixa vêm do recebimento de faturas emitidas.
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void saveEntrada();
            }}
          >
            <label className="text-sm font-medium text-ink">
              Fatura recebida
              <Select
                className="mt-2"
                onChange={(e) => {
                  const r = initialReceivables.find((x) => x.id === e.target.value);
                  setEntradaForm((c) => ({ ...c, document_id: e.target.value, montant: r ? r.amount.toFixed(2) : c.montant }));
                }}
                value={entradaForm.document_id}
              >
                <option value="">Selecionar fatura</option>
                {initialReceivables.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.numero ?? "Fatura")}{r.client ? ` · ${r.client}` : ""} (devido {euro.format(r.amount)})
                  </option>
                ))}
              </Select>
              {entradaErrors.document_id ? <span className="mt-1 block text-xs text-red-600">{entradaErrors.document_id}</span> : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-ink">
                Valor (€)
                <Input className="mt-2" min="0" onChange={(e) => setEnt("montant", e.target.value)} step="0.01" type="number" value={entradaForm.montant} />
                {entradaErrors.montant ? <span className="mt-1 block text-xs text-red-600">{entradaErrors.montant}</span> : null}
              </label>
              <label className="text-sm font-medium text-ink">
                Data
                <Input className="mt-2" onChange={(e) => setEnt("date_encaissement", e.target.value)} type="date" value={entradaForm.date_encaissement} />
                {entradaErrors.date_encaissement ? <span className="mt-1 block text-xs text-red-600">{entradaErrors.date_encaissement}</span> : null}
              </label>
            </div>
            <label className="text-sm font-medium text-ink">
              Método
              <Select className="mt-2" onChange={(e) => setEnt("moyen", e.target.value)} value={entradaForm.moyen}>
                <option value="virement">Transferência</option>
                <option value="cb">Cartão</option>
                <option value="especes">Dinheiro</option>
                <option value="cheque">Cheque</option>
                <option value="stripe">Stripe</option>
                <option value="autre">Outro</option>
              </Select>
            </label>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsEntradaOpen(false)} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button disabled={savingEntrada} type="submit">
                {savingEntrada ? "Salvando…" : "Registrar entrada"}
              </Button>
            </div>
          </form>
        )}
      </FormModal>
    </main>
  );
}
