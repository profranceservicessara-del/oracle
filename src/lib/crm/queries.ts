import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";
import type {
  CrmActivityLog,
  CrmAppointment,
  CrmClient,
  CrmClientType,
  CrmCompany,
  CrmContact,
  CrmDeal,
  CrmDocument,
  CrmDossier,
  CrmNote,
  CrmTask
} from "@/lib/crm/types";

// Lazy bootstrap: ensure the signed-in user has a CRM company (+ owner membership
// + default user_preferences). Idempotent and RLS-compliant (owner = auth.uid()).
export async function getOrCreateCompany(): Promise<CrmCompany | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: existing } = await supabase
    .from("crm_companies")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let company = (existing as CrmCompany | null) ?? null;

  if (!company) {
    const { data: created } = await supabase
      .from("crm_companies")
      .insert({ owner_id: user.id, name: "Mon entreprise" })
      .select("*")
      .single();
    company = (created as CrmCompany | null) ?? null;
  }

  if (!company) {
    return null;
  }

  // Idempotently ensure the owner membership + default preferences. This heals
  // partial bootstraps (e.g. a company created without its membership row) and
  // is safe to run on every load (unique on (company_id, user_id) / user_id).
  await supabase
    .from("crm_company_members")
    .upsert({ company_id: company.id, role: "owner", user_id: user.id }, { onConflict: "company_id,user_id" });
  await supabase.from("user_preferences").upsert({ user_id: user.id }, { onConflict: "user_id" });

  return company;
}

// Tamanho de página do CRM (SSR inicial + "Carregar mais" no client).
export const CRM_PAGE_SIZE = 20;

export type ListCrmClientsOptions = {
  limit?: number;
  offset?: number;
  search?: string;
  type?: CrmClientType | "all";
  includeArchived?: boolean;
};

// Sanitiza termo p/ o filtro .or() do PostgREST (remove chars que quebram a
// sintaxe: vírgula, parênteses, %). Substring case-insensitive via ilike.
function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim();
}

export async function listCrmClients(companyId: string, options: ListCrmClientsOptions = {}): Promise<CrmClient[]> {
  const { limit = CRM_PAGE_SIZE, offset = 0, search = "", type = "all", includeArchived = false } = options;
  const supabase = createClient();

  let query = supabase.from("crm_clients").select("*").eq("company_id", companyId);
  if (!includeArchived) {
    query = query.eq("archived", false);
  }
  if (type !== "all") {
    query = query.eq("type", type);
  }
  const term = sanitizeSearch(search);
  if (term) {
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return (data ?? []) as CrmClient[];
}

// Task with its client name embedded, for the cross-client agenda view.
export type CompanyTask = CrmTask & { crm_clients: { name: string } | null };

export async function listCompanyTasks(companyId: string): Promise<CompanyTask[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_tasks")
    .select("*, crm_clients(name)")
    .eq("company_id", companyId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (data ?? []) as CompanyTask[];
}

// Compromisso da agenda com nome do cliente embutido.
export type AppointmentWithClient = CrmAppointment & { crm_clients: { name: string } | null };

export async function listAppointments(companyId: string): Promise<AppointmentWithClient[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_appointments")
    .select("*, crm_clients(name)")
    .eq("company_id", companyId)
    .order("start_at", { ascending: true });

  return (data ?? []) as AppointmentWithClient[];
}

// Deal com nome do cliente embutido, para o board do pipeline.
export type DealWithClient = CrmDeal & { crm_clients: { name: string } | null };

export async function listDeals(companyId: string): Promise<DealWithClient[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_deals")
    .select("*, crm_clients(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (data ?? []) as DealWithClient[];
}

export async function getCrmClient(clientId: string): Promise<CrmClient | null> {
  const supabase = createClient();
  const { data } = await supabase.from("crm_clients").select("*").eq("id", clientId).maybeSingle();
  return (data as CrmClient | null) ?? null;
}

export async function listContacts(clientId: string): Promise<CrmContact[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmContact[];
}

export async function listDossiers(clientId: string): Promise<CrmDossier[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_dossiers")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmDossier[];
}

export async function listNotes(clientId: string): Promise<CrmNote[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmNote[];
}

export async function listTasks(clientId: string): Promise<CrmTask[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_tasks")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmTask[];
}

// Invoicing documents (factures/devis/avoirs) for the linked invoicing client.
// RLS on `documents` is user-scoped, so this only returns the owner's documents.
export async function listClientInvoices(invoicingClientId: string): Promise<Document[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", invoicingClientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Document[];
}

export async function listClientDocuments(clientId: string): Promise<CrmDocument[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmDocument[];
}

export async function listActivity(clientId: string): Promise<CrmActivityLog[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_activity_log")
    .select("*")
    .contains("payload", { client_id: clientId })
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as CrmActivityLog[];
}
