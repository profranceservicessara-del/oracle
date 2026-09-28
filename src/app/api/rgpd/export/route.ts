import { NextResponse } from "next/server";
import { createZip } from "@/lib/server/zip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Como restringir cada tabela ao dono dos dados:
// - user_id / owner_id / id: filtra pela coluna.
// - rls: a tabela não tem coluna de dono (é filha de outra); a policy de RLS já
//   devolve só as linhas da própria pessoa, então lê sem filtro.
type Scope = "user_id" | "owner_id" | "id" | "rls";

const TABLES: ReadonlyArray<readonly [string, Scope]> = [
  ["profiles", "id"],
  ["clients", "user_id"],
  ["catalog_items", "user_id"],
  ["documents", "user_id"],
  ["document_lines", "user_id"],
  ["payments", "user_id"],
  ["purchases", "user_id"],
  ["sequences", "user_id"],
  ["audit_log", "user_id"],
  ["contract_templates", "user_id"],
  ["supplier_invoices", "user_id"],
  ["manual_receipts", "user_id"],
  ["advisor_requests", "user_id"],
  ["urssaf_declaration_drafts", "user_id"],
  ["urssaf_declaration_lines", "user_id"],
  ["bank_connections", "user_id"],
  ["bank_accounts", "user_id"],
  ["bank_transactions", "user_id"],
  ["bank_reconciliations", "user_id"],
  // Contatos
  ["contact_thirds", "user_id"],
  ["contact_people", "user_id"],
  ["contact_addresses", "user_id"],
  // Compras
  ["purchase_documents", "user_id"],
  ["purchase_document_lines", "rls"],
  ["purchase_payments", "user_id"],
  ["purchase_incoming", "user_id"],
  // Diário
  ["event_categories", "user_id"],
  ["event_recurrences", "user_id"],
  ["events", "user_id"],
  ["event_collaborators", "rls"],
  ["event_reminders", "rls"],
  ["event_attachments", "rls"],
  // Modelos de documento
  ["document_templates", "user_id"],
  ["document_template_lines", "rls"],
  // Catálogo pro
  ["item_categories", "user_id"],
  ["variant_axes", "user_id"],
  ["variant_values", "user_id"],
  ["item_variants", "user_id"],
  ["item_variant_values", "rls"],
  ["price_lists", "user_id"],
  ["item_prices", "user_id"],
  ["item_photos", "user_id"],
  ["item_files", "user_id"],
  ["item_specifications", "user_id"],
  ["promotions", "user_id"],
  ["promotion_targets", "user_id"],
  // CRM (escopo por empresa: a RLS resolve)
  ["crm_companies", "owner_id"],
  ["crm_company_members", "rls"],
  ["crm_clients", "rls"],
  ["crm_contacts", "rls"],
  ["crm_deals", "rls"],
  ["crm_projects", "rls"],
  ["crm_tasks", "rls"],
  ["crm_time_entries", "rls"],
  ["crm_appointments", "rls"],
  ["crm_notes", "rls"],
  ["crm_dossiers", "rls"],
  ["crm_documents", "rls"],
  ["crm_activity_log", "rls"]
];

async function tableData(
  supabase: ReturnType<typeof createClient>,
  table: string,
  scope: Scope,
  userId: string
) {
  const query = supabase.from(table).select("*");
  const { data, error } = await (scope === "rls" ? query : query.eq(scope, userId));

  if (error) {
    // O detalhe (nome de coluna, constraint) vai só para o log do servidor.
    console.error(`[rgpd/export] falha ao ler ${table}:`, error.message);
    throw new Error("export_table_failed");
  }

  return data ?? [];
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const { error: rateError } = await supabase.rpc("check_rgpd_export_rate_limit");
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: 429 });
  }

  try {
    const entries = await Promise.all(
      TABLES.map(async ([table, scope]) => [table, await tableData(supabase, table, scope, user.id)] as const)
    );
    const data = Object.fromEntries(entries);
    const pdfPaths = ((data.documents as Array<{ pdf_path: string | null }>) ?? [])
      .map((document) => document.pdf_path)
      .filter(Boolean);
    const payload = {
      exported_at: new Date().toISOString(),
      pdf_paths: pdfPaths,
      tables: data
    };
    const zip = createZip([
      {
        name: "oracle-export.json",
        content: JSON.stringify(payload, null, 2)
      },
      {
        name: "pdf-paths.json",
        content: JSON.stringify(pdfPaths, null, 2)
      }
    ]);
    const path = `${user.id}/rgpd-export-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from("rgpd-exports")
      .upload(path, zip, {
        contentType: "application/zip",
        upsert: true
      });

    if (uploadError) {
      console.error("[rgpd/export] falha no upload do zip:", uploadError.message);
      return NextResponse.json({ error: "Não foi possível gerar o arquivo de exportação." }, { status: 500 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("rgpd-exports")
      .createSignedUrl(path, 900);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: "Não foi possível gerar o link de download." }, { status: 500 });
    }

    return NextResponse.json({ expiresIn: 900, signedUrl: signed.signedUrl });
  } catch (error) {
    console.error("[rgpd/export] falha ao exportar:", error);
    return NextResponse.json({ error: "Não foi possível exportar os dados." }, { status: 500 });
  }
}
