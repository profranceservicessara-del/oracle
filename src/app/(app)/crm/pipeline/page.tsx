import { redirect } from "next/navigation";
import { getOrCreateCompany, listCrmClients, listDeals } from "@/lib/crm/queries";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";

// CRM > Pipeline — bootstrap da empresa + carga inicial dos negócios e clientes
// (p/ o seletor de cliente no form). Mesmo padrão da lista/agenda do CRM.
export default async function CrmPipelinePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getOrCreateCompany();
  const [deals, clients] = await Promise.all([
    company ? listDeals(company.id) : Promise.resolve([]),
    company ? listCrmClients(company.id, { limit: 500 }) : Promise.resolve([])
  ]);
  const locale = await getLocale();

  return <PipelineClient clients={clients} company={company} initialDeals={deals} locale={locale} />;
}
