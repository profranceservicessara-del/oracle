import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { AnaliseClient, type EntradaRow, type SaidaRow, type BankRow } from "./analise-client";

// Gestão > Análise — dashboard anual: CA (recebido) × despesas × resultado por
// mês, despesas por fornecedor, tesouraria derivada do extrato bancário
// importado e ponte para a declaração (base do trimestre + Conselheiro).
// 100% read-only, derivado de payments/purchases/documents/bank_transactions.
// NÃO calcula imposto/contribuição — só a base; o motor /urssaf é a fonte.
export default async function AnalisePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, paymentsRes, purchasesRes, docsRes, paidRes, bankRes] = await Promise.all([
    supabase.from("profiles").select("declaration_periodicite, plan, subscription_status").eq("id", user.id).maybeSingle(),
    supabase.from("payments").select("date_encaissement, montant"),
    supabase.from("purchases").select("date_achat, montant, fournisseur"),
    supabase
      .from("documents")
      .select("id, total_ttc")
      .eq("type", "facture")
      .in("status", ["sent", "partial"]),
    supabase.from("payments").select("document_id, montant"),
    supabase.from("bank_transactions").select("date, amount, direction").order("date", { ascending: true })
  ]);

  const entradas: EntradaRow[] = ((paymentsRes.data ?? []) as Array<{ date_encaissement: string; montant: number }>).map(
    (p) => ({ date: p.date_encaissement, montant: Number(p.montant) || 0 })
  );
  const saidas: SaidaRow[] = ((purchasesRes.data ?? []) as Array<{ date_achat: string; montant: number; fournisseur: string }>).map(
    (p) => ({ date: p.date_achat, montant: Number(p.montant) || 0, fournisseur: p.fournisseur || "Outros" })
  );

  // A receber (mesma derivação do /financeiro, sem tocá-lo).
  const paidByDoc = new Map<string, number>();
  for (const p of (paidRes.data ?? []) as Array<{ document_id: string; montant: number }>) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }
  const aReceber = ((docsRes.data ?? []) as Array<{ id: string; total_ttc: number }>)
    .map((d) => (Number(d.total_ttc) || 0) - (paidByDoc.get(d.id) ?? 0))
    .filter((v) => v > 0.01)
    .reduce((s, v) => s + v, 0);

  const bank: BankRow[] = ((bankRes.data ?? []) as Array<{ date: string; amount: number; direction: string }>).map((t) => ({
    date: t.date,
    amount: Number(t.amount) || 0,
    direction: t.direction === "credit" ? "credit" : "debit"
  }));

  const p = (profile ?? null) as Pick<Profile, "declaration_periodicite" | "plan" | "subscription_status"> | null;

  return (
    <AnaliseClient
      aReceber={aReceber}
      bank={bank}
      entradas={entradas}
      periodicite={p?.declaration_periodicite === "mensal" ? "mensal" : "trimestral"}
      saidas={saidas}
    />
  );
}
