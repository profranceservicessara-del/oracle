"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { purchasePaymentSchema } from "./validation";
import {
  PAYMENT_METHOD_LABELS,
  isEffective,
  type PurchaseDocStatus,
  type PurchasePayment,
  type PurchasePaymentMethod
} from "./types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

type PaymentForm = {
  amount: string;
  payment_date: string;
  method: PurchasePaymentMethod;
  reference: string;
};

const emptyForm: PaymentForm = {
  amount: "",
  payment_date: new Date().toISOString().slice(0, 10),
  method: "transfer",
  reference: ""
};

export function PaymentsSection({
  documentId,
  userId,
  status,
  totalInclTax,
  onChanged
}: {
  documentId: string;
  userId: string;
  status: PurchaseDocStatus;
  totalInclTax: number;
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const enabled = isEffective(status);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("purchase_payments")
      .select("*")
      .eq("document_id", documentId)
      .order("payment_date", { ascending: true });
    setPayments((data ?? []) as PurchasePayment[]);
    setLoading(false);
  }, [supabase, documentId]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  if (!enabled) {
    return (
      <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Pagamentos liberados após validar o documento.
      </div>
    );
  }

  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.round((totalInclTax - paid) * 100) / 100;

  async function add() {
    const parsed = purchasePaymentSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.from("purchase_payments").insert({
      user_id: userId,
      document_id: documentId,
      amount: parsed.data.amount,
      payment_date: parsed.data.payment_date || null,
      method: parsed.data.method,
      reference: parsed.data.reference || null
    });
    setSaving(false);
    if (error) {
      showToast("Não foi possível registrar o pagamento. Confirme que o documento está validado.", "error");
      return;
    }
    showToast("Pagamento registrado.", "success");
    setForm({ ...emptyForm, payment_date: new Date().toISOString().slice(0, 10) });
    await load();
    onChanged();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("purchase_payments").delete().eq("id", id);
    if (error) {
      showToast("Não foi possível remover o pagamento.", "error");
      return;
    }
    showToast("Pagamento removido.", "success");
    await load();
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total TTC</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-ink">{euro.format(totalInclTax)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pago</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-emerald-600">{euro.format(paid)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Restante</p>
          <p className={`mt-1 text-base font-semibold tabular-nums ${remaining > 0 ? "text-amber-600" : "text-ink"}`}>{euro.format(remaining)}</p>
        </div>
      </div>

      {/* Lista de pagamentos */}
      {loading ? (
        <p className="text-sm text-muted">Carregando pagamentos...</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted">Nenhum pagamento registrado.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Forma</th>
                <th className="px-4 py-2.5">Referência</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr className="border-b border-line last:border-b-0" key={p.id}>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">{p.payment_date || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{PAYMENT_METHOD_LABELS[p.method]}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.reference || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(p.amount) || 0)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                      onClick={() => void remove(p.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form novo pagamento */}
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        <p className="mb-3 text-sm font-semibold text-ink">Registrar pagamento</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Valor
            <Input
              className="mt-2"
              min="0"
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              step="0.01"
              type="number"
              value={form.amount}
            />
            {errors.amount ? <span className="text-xs text-red-600">{errors.amount}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Data
            <Input className="mt-2" onChange={(e) => setForm({ ...form, payment_date: e.target.value })} type="date" value={form.payment_date} />
          </label>
          <label className="text-sm font-medium text-ink">
            Forma
            <Select
              className="mt-2"
              onChange={(e) => setForm({ ...form, method: e.target.value as PurchasePaymentMethod })}
              value={form.method}
            >
              {(Object.keys(PAYMENT_METHOD_LABELS) as PurchasePaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Referência (opcional)
            <Input className="mt-2" onChange={(e) => setForm({ ...form, reference: e.target.value })} value={form.reference} />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button disabled={saving} onClick={() => void add()} type="button">
            {saving ? "Salvando..." : "Adicionar pagamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
