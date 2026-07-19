import { notFound, redirect } from "next/navigation";
import { getProject, listProjectTasks } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import { ProjectBoardClient } from "./project-board-client";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const project = await getProject(params.id);
  if (!project) {
    notFound();
  }

  const tasks = await listProjectTasks(project.id);

  return <ProjectBoardClient companyId={project.company_id} initialTasks={tasks} project={project} />;
}
