"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { purchaseSchema } from "@/lib/validation";

export type CashMovement = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: "in" | "out";
  label: string;
  method: string | null;
  amount: number;
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

function yearsOf(movs: CashMovement[]): number[] {
  const set = new Set<number>();
  for (const m of movs) {
    const y = Number(m.date?.slice(0, 4));
    if (y) set.add(y);
  }
  set.add(new Date().getFullYear());
  return [...set].sort((a, b) => b - a);
}

export function FinanceiroClient({ initialMovements, userId }: { initialMovements: CashMovement[]; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [movements, setMovements] = useState(initialMovements);
  const years = useMemo(() => yearsOf(movements), [movements]);
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () =>
      movements
        .filter((m) => m.date?.slice(0, 4) === String(year))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [movements, year]
  );

  const totalIn = visible.filter((m) => m.kind === "in").reduce((s, m) => s + m.amount, 0);
  const totalOut = visible.filter((m) => m.kind === "out").reduce((s, m) => s + m.amount, 0);
  const saldo = totalIn - totalOut;

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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Fluxo de Caixa</h1>
          <p className="mt-1 text-sm text-muted">Recebimentos das faturas (entradas) e compras (saídas), com saldo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button onClick={() => { setForm(emptyForm); setErrors({}); setIsOpen(true); }} type="button">
            + Saída
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Entradas</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">{euro.format(totalIn)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saídas</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600">{euro.format(totalOut)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saldo</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${saldo >= 0 ? "text-ink" : "text-rose-600"}`}>{euro.format(saldo)}</p>
        </div>
      </div>

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
    </main>
  );
}
