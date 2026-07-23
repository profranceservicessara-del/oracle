import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountingCode, PurchaseDocType, PurchaseDocument, SupplierOption } from "./types";

// Carrega os dados comuns das páginas por tipo do módulo Compras.
// Escopo garantido por RLS (user_id = auth.uid()). Redireciona ao login se
// não houver sessão.
export async function loadComprasData(type: PurchaseDocType): Promise<{
  initialDocs: PurchaseDocument[];
  suppliers: SupplierOption[];
  accountingCodes: AccountingCode[];
  userId: string;
}> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [docsRes, suppliersRes, codesRes] = await Promise.all([
    supabase
      .from("purchase_documents")
      .select("*")
      .eq("type", type)
      .order("document_date", { ascending: false }),
    supabase
      .from("contact_thirds")
      .select("id,name")
      .eq("third_type", "supplier")
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("accounting_codes")
      .select("id,code,label,is_active")
      .eq("is_active", true)
      .order("code", { ascending: true })
  ]);

  return {
    initialDocs: (docsRes.data ?? []) as PurchaseDocument[],
    suppliers: (suppliersRes.data ?? []) as SupplierOption[],
    accountingCodes: (codesRes.data ?? []) as AccountingCode[],
    userId: user.id
  };
}
