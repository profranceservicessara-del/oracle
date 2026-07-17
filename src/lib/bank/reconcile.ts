import type { BankTransaction } from "@/lib/types";

// Matching read-only: crédito bancário "a conciliar" × faturas em aberto.
// Conservador de propósito: só sugere quando o VALOR do crédito bate com o
// saldo devido de uma fatura (evita match errado). Cliente/data só desempatam.
// Nunca concilia sozinho — só produz sugestões para confirmação humana.

export type OpenInvoice = {
  id: string;
  numero: string | null;
  client: string | null;
  due: number;
  date_echeance: string | null;
};

export type Suggestion = {
  transactionId: string;
  documentId: string;
  numero: string | null;
  client: string | null;
  due: number;
  score: number;
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(Math.round((da - db) / 86400000));
}

// Retorna, por transação, a melhor fatura candidata (ou nada).
export function suggestReconciliations(
  transactions: Pick<BankTransaction, "id" | "amount" | "date" | "label" | "direction" | "reconcile_status">[],
  invoices: OpenInvoice[]
): Suggestion[] {
  const out: Suggestion[] = [];
  const credits = transactions.filter(
    (t) => t.direction === "credit" && (t.reconcile_status === "pending" || t.reconcile_status === "suggested")
  );

  for (const tx of credits) {
    const amount = Number(tx.amount) || 0;
    let best: Suggestion | null = null;

    for (const inv of invoices) {
      // Condição necessária: valor do crédito == saldo devido (tolerância 1 cent).
      if (Math.abs(inv.due - amount) > 0.01) continue;

      let score = 100; // valor bate
      const label = (tx.label || "").toLowerCase();
      if (inv.client) {
        const token = inv.client.toLowerCase().split(/\s+/).find((w) => w.length >= 4);
        if (token && label.includes(token)) score += 30;
      }
      if (inv.numero && label.includes(inv.numero.toLowerCase())) score += 40;
      if (inv.date_echeance && daysBetween(tx.date, inv.date_echeance) <= 30) score += 15;

      if (!best || score > best.score) {
        best = { transactionId: tx.id, documentId: inv.id, numero: inv.numero, client: inv.client, due: inv.due, score };
      }
    }

    if (best) out.push(best);
  }

  return out;
}
