import { redirect } from "next/navigation";
import { getOrCreateCompany, listCrmClients } from "@/lib/crm/queries";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { CrmClientsClient } from "./crm-clients-client";

export default async function CrmPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getOrCreateCompany();
  const clients = company ? await listCrmClients(company.id) : [];
  const locale = await getLocale();

  return (
    <CrmClientsClient company={company} initialClients={clients} locale={locale} userId={user.id} />
  );
}
