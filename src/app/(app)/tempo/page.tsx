import { redirect } from "next/navigation";
import { getOrCreateCompany, listCompanyMembers, listCrmClients, listMyWorkTasks, listProjects, listTimeEntries } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { GestaoTempoClient } from "./gestao-client";

function monthBounds(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
}

export default async function GestaoTempoPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("prenom, nome").eq("id", user.id).maybeSingle();
  const p = profile as Pick<Profile, "prenom" | "nome"> | null;
  const userName = [p?.prenom, p?.nome].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Você";

  const company = await getOrCreateCompany();
  const { from, to } = monthBounds(new Date());
  const [members, projects, clients, tasks, entries] = company
    ? await Promise.all([
        listCompanyMembers(company.id, user.id, userName),
        listProjects(company.id),
        listCrmClients(company.id, { limit: 500 }),
        listMyWorkTasks(company.id, user.id),
        listTimeEntries(company.id, { from, to })
      ])
    : [[], [], [], [], []];

  return (
    <GestaoTempoClient
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      companyId={company?.id ?? ""}
      initialEntries={entries}
      members={members}
      projects={projects.map((pr) => ({ id: pr.id, name: pr.name, client_id: pr.client_id }))}
      tasks={tasks.map((t) => ({ id: t.id, title: t.title, project_id: t.project_id, priority: t.priority, due_date: t.due_date, project_name: t.crm_projects?.name ?? null }))}
      userId={user.id}
      userName={userName}
    />
  );
}
