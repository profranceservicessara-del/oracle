import { redirect } from "next/navigation";
import { getOrCreateCompany, listCrmClients, listProjects } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import { ProjetosClient } from "./projetos-client";

// Produtividade > Projetos — bootstrap da empresa (RLS) + carga dos projetos
// com estatísticas de tarefas. Tarefas do projeto vivem em crm_tasks.
export default async function ProjetosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getOrCreateCompany();
  const [projects, clients] = company
    ? await Promise.all([listProjects(company.id), listCrmClients(company.id, { limit: 500 })])
    : [[], []];

  return (
    <ProjetosClient
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      companyId={company?.id ?? ""}
      initialProjects={projects}
    />
  );
}
