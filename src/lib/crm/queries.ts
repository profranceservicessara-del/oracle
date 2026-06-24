import { createClient } from "@/lib/supabase/server";
import type {
  CrmClient,
  CrmCompany,
  CrmContact,
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

  if (existing) {
    return existing as CrmCompany;
  }

  const { data: created, error } = await supabase
    .from("crm_companies")
    .insert({ owner_id: user.id, name: "Mon entreprise" })
    .select("*")
    .single();

  if (error || !created) {
    return null;
  }

  await supabase.from("crm_company_members").insert({
    company_id: created.id,
    role: "owner",
    user_id: user.id
  });
  await supabase.from("user_preferences").upsert({ user_id: user.id }, { onConflict: "user_id" });

  return created as CrmCompany;
}

export async function listCrmClients(companyId: string): Promise<CrmClient[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crm_clients")
    .select("*")
    .eq("company_id", companyId)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  return (data ?? []) as CrmClient[];
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
