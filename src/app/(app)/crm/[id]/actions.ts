"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// CRM Phase 6 — create a facture/devis from a CRM client.
// Ensures an invoicing `clients` row exists (find-or-create), persists the link
// on crm_clients.client_id, then opens the document editor with it preselected.
//
// The CRM has no SIREN, so a new invoicing client is created as `particulier`
// (always constraint-valid). The user completes raison sociale / SIREN in the
// invoicing client editor if they need to bill it as a professionnel.
export async function createInvoiceFromCrmClient(crmClientId: string, type: "facture" | "devis") {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: crmClient } = await supabase
    .from("crm_clients")
    .select("*")
    .eq("id", crmClientId)
    .maybeSingle();
  if (!crmClient) {
    redirect("/crm");
  }

  let invoicingClientId: string | null = crmClient.client_id ?? null;

  // Linked already? Confirm the invoicing client still exists (RLS-scoped to the user).
  if (invoicingClientId) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("id", invoicingClientId)
      .maybeSingle();
    if (!existing) {
      invoicingClientId = null;
    }
  }

  // Not linked: try to reuse an existing invoicing client matched by email.
  if (!invoicingClientId && crmClient.email) {
    const { data: match } = await supabase
      .from("clients")
      .select("id")
      .eq("email", crmClient.email)
      .eq("archived", false)
      .limit(1)
      .maybeSingle();
    if (match) {
      invoicingClientId = match.id;
    }
  }

  // Still nothing: create a fresh invoicing client from the CRM data.
  if (!invoicingClientId) {
    const { data: created } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        type: "particulier",
        nom: crmClient.name,
        email: crmClient.email,
        telephone: crmClient.phone
      })
      .select("id")
      .single();
    invoicingClientId = created?.id ?? null;
  }

  // Persist the bridge so future invoices reuse the same invoicing client.
  if (invoicingClientId && crmClient.client_id !== invoicingClientId) {
    await supabase.from("crm_clients").update({ client_id: invoicingClientId }).eq("id", crmClientId);
  }

  const query = invoicingClientId ? `&client=${invoicingClientId}` : "";
  redirect(`/documentos/novo?type=${type}${query}`);
}
