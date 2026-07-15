import { redirect } from "next/navigation";
import { UpgradeState } from "@/components/app/upgrade-state";
import { requiresPaidPlan } from "@/lib/plan-matrix";
import { createClient } from "@/lib/supabase/server";
import { AssistenteClient } from "./assistente-client";

// Gestão > Assistente de Declarações (Premium). Fase 1: shell informativo
// determinístico — explica o motor URSSAF existente. Sem IA, sem API, sem
// persistência. Gate ESTRITO (requiresPaidPlan): só Premium ativo entra;
// free/inativo/planos abaixo veem upgrade. Grandfather dos módulos antigos
// (isGated) permanece inalterado.
export default async function AssistentePage() {
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
        description="O Assistente de Declarações explica sua base URSSAF, esclarece pendências e ajuda a preparar suas informações. Disponível no plano Premium."
        requiredPlan="premium"
        title="Assistente de Declarações é um recurso Premium"
      />
    );
  }

  return <AssistenteClient />;
}
