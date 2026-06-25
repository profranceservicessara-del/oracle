import { redirect } from "next/navigation";
import { getOrCreateCompany, listCompanyTasks } from "@/lib/crm/queries";
import { getLocale } from "@/lib/i18n/server";
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

  const company = await getOrCreateCompany();
  const tasks = company ? await listCompanyTasks(company.id) : [];
  const locale = await getLocale();

  return <AgendaClient initialTasks={tasks} locale={locale} />;
}
