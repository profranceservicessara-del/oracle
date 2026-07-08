import { redirect } from "next/navigation";
import { UpgradeState } from "@/components/app/upgrade-state";
import { getOrCreateCompany, listCompanyTasks } from "@/lib/crm/queries";
import { getLocale } from "@/lib/i18n/server";
import { isGated } from "@/lib/plan-matrix";
import { createClient } from "@/lib/supabase/server";
import { AgendaClient } from "./agenda-client";

export default async function CrmAgendaPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("plan, subscription_status").eq("id", user.id).maybeSingle();
  if (isGated(profile, "pro")) {
    return <UpgradeState description="A agenda do CRM está disponível a partir do plano Pro." requiredPlan="pro" title="Agenda é um recurso Pro" />;
  }

  const company = await getOrCreateCompany();
  const tasks = company ? await listCompanyTasks(company.id) : [];
  const locale = await getLocale();

  return <AgendaClient initialTasks={tasks} locale={locale} />;
}
