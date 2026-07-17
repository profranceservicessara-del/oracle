"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Suggestion } from "@/lib/bank/reconcile";
import { createClient } from "@/lib/supabase/client";
import type { BankAccount, BankConnection, BankReconcileStatus, BankTransaction } from "@/lib/types";
import { confirmReconciliationAction } from "./actions";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

const statusMeta: Record<BankReconcileStatus, { label: string; badge: string }> = {
  pending: { label: "A conciliar", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  suggested: { label: "Sugerida", badge: "bg-sky-50 text-sky-700 ring-sky-200" },
  confirmed: { label: "Conciliada", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ignored: { label: "Ignorada", badge: "bg-slate-100 text-slate-500 ring-slate-200" },
  non_business: { label: "Não profissional", badge: "bg-slate-100 text-slate-500 ring-slate-200" }
};

function fmtDate(iso: string) {
  const p = iso.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

// Parse de CSV simples: data;descrição;valor (aceita , ou . decimal e
// separador ; ou ,). Datas AAAA-MM-DD ou DD/MM/AAAA.
function parseCsv(text: string): { date: string; label: string; amount: number }[] {
  const out: { date: string; label: string; amount: number }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) continue;
    let [d, label, amountRaw] = [parts[0], parts.slice(1, -1).join(" "), parts[parts.length - 1]];
    const dm = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dm) d = `${dm[3]}-${dm[2]}-${dm[1]}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const amount = Number(amountRaw.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0 || !label) continue;
    out.push({ date: d, label: label.slice(0, 200), amount });
  }
  return out;
}

export function BancoClient({
  connections,
  accounts,
  transactions,
  suggestions,
  userId
}: {
  connections: BankConnection[];
  accounts: BankAccount[];
  transactions: BankTransaction[];
  suggestions: Suggestion[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const suggestionByTx = useMemo(() => new Map(suggestions.map((s) => [s.transactionId, s])), [suggestions]);
  const pending = transactions.filter((t) => t.reconcile_status === "pending").length;

  async function confirmReconcile(transactionId: string, documentId: string) {
    setBusy(true);
    try {
      const r = await confirmReconciliationAction(transactionId, documentId);
      if (r.error) {
        showToast(r.error, "error");
        return;
      }
      showToast("Recebimento conciliado e registrado no caixa.", "success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function connectBank() {
    setBusy(true);
    try {
      const res = await fetch("/api/bank/connect", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        showToast(data?.error ?? "Não foi possível iniciar a conexão.", res.status === 503 ? "info" : "error");
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }

  // Garante connection+account "manual" para importações CSV.
  async function ensureManualAccount(): Promise<string | null> {
    const existing = accounts.find((a) => connections.find((c) => c.id === a.connection_id)?.provider === "manual");
    if (existing) return existing.id;
    const { data: conn, error: connErr } = await supabase
      .from("bank_connections")
      .insert({ user_id: userId, provider: "manual", provider_item_id: "manual", label: "Importação manual" })
      .select("id")
      .single();
    if (connErr || !conn) return null;
    const { data: acc, error: accErr } = await supabase
      .from("bank_accounts")
      .insert({ connection_id: conn.id, user_id: userId, provider_account_id: "manual", name: "Conta importada (extrato)" })
      .select("id")
      .single();
    if (accErr || !acc) return null;
    return acc.id;
  }

  async function importCsv(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        showToast("Nenhuma linha válida. Formato: data;descrição;valor.", "error");
        return;
      }
      const accountId = await ensureManualAccount();
      if (!accountId) {
        showToast("Não foi possível preparar a conta de importação.", "error");
        return;
      }
      // provider_tx_id determinístico => re-importar o mesmo extrato não duplica.
      const payload = rows.map((r) => ({
        account_id: accountId,
        user_id: userId,
        provider_tx_id: `${r.date}|${r.label}|${r.amount.toFixed(2)}`,
        date: r.date,
        amount: Math.abs(r.amount),
        label: r.label,
        direction: r.amount >= 0 ? "credit" : "debit",
        reconcile_status: "pending"
      }));
      const { error } = await supabase
        .from("bank_transactions")
        .upsert(payload, { onConflict: "account_id,provider_tx_id", ignoreDuplicates: true });
      if (error) {
        showToast("Não foi possível importar as transações.", "error");
        return;
      }
      showToast(`${rows.length} linha(s) processada(s). Duplicadas são ignoradas.`, "success");
      router.refresh();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setTxStatus(tx: BankTransaction, status: BankReconcileStatus) {
    const { error } = await supabase.from("bank_transactions").update({ reconcile_status: status }).eq("id", tx.id);
    if (error) {
      showToast("Não foi possível atualizar.", "error");
      return;
    }
    showToast("Transação atualizada.", "success");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
            <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4F46E5] ring-1 ring-inset ring-[#E0E7FF]">Premium</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Contas bancárias</h1>
          <p className="mt-1 text-sm text-muted">Conecte seu banco ou importe o extrato para preparar a conciliação com faturas e recebimentos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void connectBank()} type="button">
            Conectar à banca
          </Button>
          <Button disabled={busy} onClick={() => fileRef.current?.click()} type="button" variant="secondary">
            Importar transações
          </Button>
          <input accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); }} ref={fileRef} type="file" />
        </div>
      </div>

      {/* Disclaimer anti double-count */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        Transações bancárias não entram no fluxo de caixa nem na declaração URSSAF automaticamente. Só a conciliação confirmada com uma fatura/recebimento conta — os créditos ficam &ldquo;A conciliar&rdquo; até você decidir.
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contas</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{accounts.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Transações</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{transactions.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">A conciliar</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${pending > 0 ? "text-amber-600" : "text-ink"}`}>{pending}</p>
        </div>
      </div>

      {/* Contas */}
      {accounts.length > 0 ? (
        <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Contas</h2>
          </div>
          <ul className="divide-y divide-line">
            {accounts.map((a) => (
              <li className="flex items-center justify-between gap-3 px-5 py-3 text-sm" key={a.id}>
                <span className="font-medium text-ink">{a.name}</span>
                <span className="text-xs text-muted">{a.iban_last4 ? `•••• ${a.iban_last4}` : a.currency}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Transações */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhuma transação ainda.</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Conecte seu banco (quando disponível) ou importe um extrato CSV no formato <span className="font-mono text-xs">data;descrição;valor</span>.
          </p>
          <Button className="mt-6" disabled={busy} onClick={() => fileRef.current?.click()} type="button">
            Importar transações
          </Button>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Transações</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{transactions.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Descrição</th>
                  <th className="px-4 py-2.5">Conta</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const meta = statusMeta[t.reconcile_status];
                  const decided = t.reconcile_status === "ignored" || t.reconcile_status === "non_business";
                  return (
                    <tr className="border-b border-line last:border-b-0" key={t.id}>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{fmtDate(t.date)}</td>
                      <td className="max-w-[260px] truncate px-4 py-2.5 text-ink">{t.label}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{accountName.get(t.account_id) ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${t.direction === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.direction === "credit" ? "+" : "−"}{euro.format(Number(t.amount) || 0)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {t.reconcile_status === "pending" && suggestionByTx.get(t.id) ? (
                            <button
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              disabled={busy}
                              onClick={() => { const s = suggestionByTx.get(t.id)!; void confirmReconcile(t.id, s.documentId); }}
                              type="button"
                              title={`Fatura ${suggestionByTx.get(t.id)!.numero ?? ""}`}
                            >
                              Conciliar com {suggestionByTx.get(t.id)!.numero ?? "fatura"}
                            </button>
                          ) : null}
                          {t.reconcile_status === "pending" ? (
                            <>
                              <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" onClick={() => void setTxStatus(t, "non_business")} type="button">
                                Não profissional
                              </button>
                              <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" onClick={() => void setTxStatus(t, "ignored")} type="button">
                                Ignorar
                              </button>
                            </>
                          ) : decided ? (
                            <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" onClick={() => void setTxStatus(t, "pending")} type="button">
                              Rever
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mt-4 text-xs text-muted">
        A conciliação com faturas e recebimentos chega na próxima etapa. Créditos conciliados viram recebimentos no <Link className="font-medium text-brand hover:underline" href="/financeiro">fluxo de caixa</Link> — nunca antes da sua confirmação.
      </p>
    </main>
  );
}
