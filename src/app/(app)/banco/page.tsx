import { redirect } from "next/navigation";
import { UpgradeState } from "@/components/app/upgrade-state";
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

  const [connectionsRes, accountsRes, txRes] = await Promise.all([
    supabase.from("bank_connections").select("*").order("created_at", { ascending: true }),
    supabase.from("bank_accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("bank_transactions").select("*").order("date", { ascending: false }).limit(200)
  ]);

  return (
    <BancoClient
      accounts={(accountsRes.data ?? []) as BankAccount[]}
      connections={(connectionsRes.data ?? []) as BankConnection[]}
      transactions={(txRes.data ?? []) as BankTransaction[]}
      userId={user.id}
    />
  );
}
