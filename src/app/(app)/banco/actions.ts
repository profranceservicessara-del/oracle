"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Conciliação bancária (Fase 6). Confirma o match transação↔fatura criando um
// payment REAL. Anti double-count:
// - checa que a transação ainda não foi conciliada (bank_reconciliations.
//   transaction_id é UNIQUE);
// - o trigger do banco garante fatura emitida e impede ultrapassar o total_ttc;
// - grava bank_reconciliations(payment_id) para rastreio.
// payment.date_encaissement = data da transação => fonte de verdade do
// /financeiro e do motor URSSAF (draft não-confirmado pode recalcular).

type Result = { error?: string; ok?: boolean };

export async function confirmReconciliationAction(transactionId: string, documentId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Transação do próprio usuário, ainda conciliável.
  const { data: tx } = await supabase
    .from("bank_transactions")
    .select("id, amount, date, label, direction, reconcile_status")
    .eq("id", transactionId)
    .maybeSingle();
  if (!tx) return { error: "Transação não encontrada." };
  if (tx.direction !== "credit") return { error: "Só créditos podem virar recebimento." };
  if (tx.reconcile_status === "confirmed") return { error: "Transação já conciliada." };

  // Já existe reconciliação? (defesa extra além do UNIQUE)
  const { data: already } = await supabase
    .from("bank_reconciliations")
    .select("id")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (already) return { error: "Transação já conciliada." };

  // Fatura em aberto do próprio usuário + saldo devido.
  const { data: doc } = await supabase
    .from("documents")
    .select("id, total_ttc, status, type")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc || doc.type !== "facture" || !["sent", "partial"].includes(doc.status)) {
    return { error: "Fatura inválida ou não está em aberto." };
  }
  const { data: paidRows } = await supabase.from("payments").select("montant").eq("document_id", documentId);
  const paid = ((paidRows ?? []) as Array<{ montant: number }>).reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const due = (Number(doc.total_ttc) || 0) - paid;
  if (due <= 0.01) return { error: "Esta fatura já está quitada." };

  // Nunca ultrapassa o saldo (o trigger também barra, aqui evita o erro).
  const montant = Math.min(Number(tx.amount) || 0, due);
  if (montant <= 0) return { error: "Valor inválido." };

  // 1) cria o payment (trigger valida fatura emitida + teto).
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      document_id: documentId,
      date_encaissement: tx.date,
      montant,
      moyen: "virement",
      reference: (tx.label || "").slice(0, 200)
    })
    .select("id")
    .single();
  if (payErr || !payment) return { error: "Não foi possível registrar o recebimento." };

  // 2) grava a reconciliação (UNIQUE protege contra corrida).
  const { error: recErr } = await supabase
    .from("bank_reconciliations")
    .insert({ transaction_id: transactionId, user_id: user.id, payment_id: payment.id });
  if (recErr) {
    // Corrida/duplicata: desfaz o payment para não deixar recebimento órfão.
    await supabase.from("payments").delete().eq("id", payment.id);
    return { error: "Transação já conciliada." };
  }

  // 3) marca a transação como conciliada.
  await supabase.from("bank_transactions").update({ reconcile_status: "confirmed" }).eq("id", transactionId);

  revalidatePath("/banco");
  revalidatePath("/financeiro");
  revalidatePath("/urssaf");
  return { ok: true };
}
