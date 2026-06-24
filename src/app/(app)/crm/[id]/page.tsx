import { notFound, redirect } from "next/navigation";
import {
  getCrmClient,
  listActivity,
  listContacts,
  listDossiers,
  listNotes,
  listTasks
} from "@/lib/crm/queries";
import { getLocale } from "@/lib/i18n/server";
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

  const [contacts, dossiers, notes, tasks, activity] = await Promise.all([
    listContacts(client.id),
    listDossiers(client.id),
    listNotes(client.id),
    listTasks(client.id),
    listActivity(client.id)
  ]);

  const locale = await getLocale();

  return (
    <CrmClientDetail
      client={client}
      initialActivity={activity}
      locale={locale}
      initialContacts={contacts}
      initialDossiers={dossiers}
      initialNotes={notes}
      initialTasks={tasks}
      userId={user.id}
    />
  );
}
