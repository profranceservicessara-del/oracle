import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroClient, type CashMovement, type Receivable } from "./financeiro-client";

// Gestão > Fluxo de Caixa — visão real: recebimentos (payments) = entradas,
// compras (purchases) = saídas, e faturas emitidas não pagas = a receber
// (derivado de documents; sem tabela nova).
export default async function FinanceiroPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: payments }, { data: purchases }, { data: openFactures }, { data: paidRows }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, date_encaissement, montant, moyen, documents(numero)")
      .order("date_encaissement", { ascending: false }),
    supabase.from("purchases").select("*").order("date_achat", { ascending: false }),
    supabase
      .from("documents")
      .select("id, numero, total_ttc, date_echeance, clients(nom, raison_sociale)")
      .eq("type", "facture")
      .in("status", ["sent", "partial"])
      .order("date_echeance", { ascending: true, nullsFirst: false }),
    supabase.from("payments").select("document_id, montant")
  ]);

  const entradas: CashMovement[] = (payments ?? []).map((p) => {
    const row = p as unknown as {
      id: string;
      date_encaissement: string;
      montant: number;
      moyen: string | null;
      documents: { numero: string | null } | { numero: string | null }[] | null;
    };
    const doc = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    return {
      id: `in-${row.id}`,
      date: row.date_encaissement,
      kind: "in",
      label: doc?.numero ? `Recebimento · ${doc.numero}` : "Recebimento",
      method: row.moyen ?? null,
      amount: Number(row.montant) || 0
    };
  });

  const saidas: CashMovement[] = (purchases ?? []).map((p) => {
    const row = p as { id: string; date_achat: string; montant: number; moyen: string | null; fournisseur: string; designation: string };
    return {
      id: `out-${row.id}`,
      date: row.date_achat,
      kind: "out",
      label: [row.fournisseur, row.designation].filter(Boolean).join(" · ") || "Compra",
      method: row.moyen ?? null,
      amount: Number(row.montant) || 0
    };
  });

  // Total já pago por fatura (p/ calcular o saldo devido).
  const paidByDoc = new Map<string, number>();
  for (const p of (paidRows ?? []) as Array<{ document_id: string; montant: number }>) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }
  const today = new Date().toISOString().slice(0, 10);

  const receivables: Receivable[] = ((openFactures ?? []) as unknown as Array<{
    id: string;
    numero: string | null;
    total_ttc: number;
    date_echeance: string | null;
    clients: { nom: string | null; raison_sociale: string | null } | { nom: string | null; raison_sociale: string | null }[] | null;
  }>)
    .map((f) => {
      const cli = Array.isArray(f.clients) ? f.clients[0] : f.clients;
      const due = (Number(f.total_ttc) || 0) - (paidByDoc.get(f.id) ?? 0);
      return {
        id: f.id,
        numero: f.numero,
        client: cli?.raison_sociale || cli?.nom || null,
        dueDate: f.date_echeance,
        amount: due,
        overdue: Boolean(f.date_echeance && f.date_echeance < today)
      };
    })
    .filter((r) => r.amount > 0.01);

  return <FinanceiroClient initialMovements={[...entradas, ...saidas]} initialReceivables={receivables} userId={user.id} />;
}
