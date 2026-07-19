import { redirect } from "next/navigation";
import { getOrCreateCompany, listCompanyMembers, listCrmClients, listMyWorkTasks, listProjects, listTimeEntries } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { TempoListClient } from "../tempo-list-client";

function monthBounds(d: Date) {
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}

// "Todos os momentos" = nível empresa. Isolamento por tenant via RLS
// (crm_is_company_member) — a query só devolve lançamentos da company do usuário.
export default async function TodosMomentosPage() {
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
    <TempoListClient
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      companyId={company?.id ?? ""}
      initialEntries={entries}
      members={members}
      projects={projects.map((pr) => ({ id: pr.id, name: pr.name, client_id: pr.client_id }))}
      scope="org"
      tasks={tasks.map((t) => ({ id: t.id, title: t.title, project_id: t.project_id }))}
      userId={user.id}
    />
  );
}
