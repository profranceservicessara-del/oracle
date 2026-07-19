import { redirect } from "next/navigation";
import { getOrCreateCompany, listMyWorkTasks, listProjects } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import { MeuTrabalhoClient } from "./meu-trabalho-client";

// Produtividade > Projetos > Meu trabalho — painel pessoal com as tarefas de
// todos os projetos, agrupadas por vencimento e prioridade.
export default async function MeuTrabalhoPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getOrCreateCompany();
  const [tasks, projects] = company
    ? await Promise.all([listMyWorkTasks(company.id, user.id), listProjects(company.id)])
    : [[], []];

  return (
    <MeuTrabalhoClient
      allProjects={projects.map((project) => ({ id: project.id, name: project.name }))}
      initialTasks={tasks}
      recentProjects={projects.slice(0, 6).map((project) => ({ id: project.id, name: project.name }))}
    />
  );
}
