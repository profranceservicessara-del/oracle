import { notFound, redirect } from "next/navigation";
import {
  getCrmClient,
  listContacts,
  listDossiers,
  listNotes,
  listTasks
} from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import { CrmClientDetail } from "./crm-client-detail";

export default async function CrmClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const client = await getCrmClient(params.id);

  if (!client) {
    notFound();
  }

  const [contacts, dossiers, notes, tasks] = await Promise.all([
    listContacts(client.id),
    listDossiers(client.id),
    listNotes(client.id),
    listTasks(client.id)
  ]);

  return (
    <CrmClientDetail
      client={client}
      initialContacts={contacts}
      initialDossiers={dossiers}
      initialNotes={notes}
      initialTasks={tasks}
      userId={user.id}
    />
  );
}
