import { redirect } from "next/navigation";
import { UpgradeState } from "@/components/app/upgrade-state";
import { getOrCreateCompany, listAppointments, listCompanyTasks, listCrmClients } from "@/lib/crm/queries";
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
    return <UpgradeState description="A agenda comercial está disponível a partir do plano Pro." requiredPlan="pro" title="Agenda é um recurso Pro" />;
  }

  const company = await getOrCreateCompany();
  const [appointments, tasks, clients] = company
    ? await Promise.all([
        listAppointments(company.id),
        listCompanyTasks(company.id),
        listCrmClients(company.id, { limit: 500 })
      ])
    : [[], [], []];
  const locale = await getLocale();

  return (
    <AgendaClient
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      companyId={company?.id ?? ""}
      initialAppointments={appointments}
      locale={locale}
      tasks={tasks}
    />
  );
}
