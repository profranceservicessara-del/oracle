import { redirect } from "next/navigation";
import { UpgradeState } from "@/components/app/upgrade-state";
import { type OpenInvoice, type Suggestion, suggestReconciliations } from "@/lib/bank/reconcile";
import { requiresPaidPlan } from "@/lib/plan-matrix";
import { createClient } from "@/lib/supabase/server";
import type { BankAccount, BankConnection, BankTransaction } from "@/lib/types";
import { BancoClient } from "./banco-client";

// Gestão > Contas bancárias (Premium, Fase 5). Conexão automática (Bridge)
// pronta-para-ativar + importação manual de transações (CSV) já funcional.
// REGRA: transações bancárias cruas NUNCA entram no /financeiro nem na
// declaração URSSAF — conciliação confirmada (Fase 6) é o único caminho.
export default async function BancoPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (requiresPaidPlan(profile, "premium")) {
    return (
      <UpgradeState
        description="Conecte seu banco ou importe transações para preparar a conciliação com suas faturas e recebimentos. Disponível no plano Premium."
        requiredPlan="premium"
        title="Contas bancárias é um recurso Premium"
      />
    );
  }

  const [connectionsRes, accountsRes, txRes, docsRes, paidRes] = await Promise.all([
    supabase.from("bank_connections").select("*").order("created_at", { ascending: true }),
    supabase.from("bank_accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("bank_transactions").select("*").order("date", { ascending: false }).limit(200),
    supabase
      .from("documents")
      .select("id, numero, total_ttc, date_echeance, clients(nom, raison_sociale)")
      .eq("type", "facture")
      .in("status", ["sent", "partial"]),
    supabase.from("payments").select("document_id, montant")
  ]);

  const transactions = (txRes.data ?? []) as BankTransaction[];

  // Faturas em aberto com saldo devido (mesma derivação do /financeiro).
  const paidByDoc = new Map<string, number>();
  for (const p of (paidRes.data ?? []) as Array<{ document_id: string; montant: number }>) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }
  const openInvoices: OpenInvoice[] = ((docsRes.data ?? []) as unknown as Array<{
    id: string;
    numero: string | null;
    total_ttc: number;
    date_echeance: string | null;
    clients: { nom: string | null; raison_sociale: string | null } | { nom: string | null; raison_sociale: string | null }[] | null;
  }>)
    .map((d) => {
      const cli = Array.isArray(d.clients) ? d.clients[0] : d.clients;
      return {
        id: d.id,
        numero: d.numero,
        client: cli?.raison_sociale || cli?.nom || null,
        due: (Number(d.total_ttc) || 0) - (paidByDoc.get(d.id) ?? 0),
        date_echeance: d.date_echeance
      };
    })
    .filter((i) => i.due > 0.01);

  const suggestions: Suggestion[] = suggestReconciliations(transactions, openInvoices);

  return (
    <BancoClient
      accounts={(accountsRes.data ?? []) as BankAccount[]}
      connections={(connectionsRes.data ?? []) as BankConnection[]}
      suggestions={suggestions}
      transactions={transactions}
      userId={user.id}
    />
  );
}
