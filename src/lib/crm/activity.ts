import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmActivityLog } from "@/lib/crm/types";

export type ActivityInput = {
  action: string;
  clientId?: string | null;
  companyId: string;
  entity: string;
  entityId?: string | null;
  label: string;
  userId: string;
};

// Best-effort activity logging from the browser client.
// RLS allows insert only as self (profile_id = auth.uid()) into accessible companies.
export async function logActivity(
  supabase: SupabaseClient,
  input: ActivityInput
): Promise<CrmActivityLog | null> {
  const { data } = await supabase
    .from("crm_activity_log")
    .insert({
      action: input.action,
      company_id: input.companyId,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      payload: { client_id: input.clientId ?? null, label: input.label },
      profile_id: input.userId
    })
    .select("*")
    .single();

  return (data as CrmActivityLog | null) ?? null;
}
