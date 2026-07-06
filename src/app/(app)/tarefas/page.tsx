import { redirect } from "next/navigation";
import { getOrCreateCompany, listCompanyTasks } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import { TarefasClient } from "./tarefas-client";

// Produtividade > Tarefas — bootstrap da empresa (RLS) + carga inicial das
// tarefas persistidas em crm_tasks. Mesmo padrão da agenda do CRM.
export default async function TarefasPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getOrCreateCompany();
  const tasks = company ? await listCompanyTasks(company.id) : [];

  return <TarefasClient companyId={company?.id ?? null} initialTasks={tasks} />;
}
