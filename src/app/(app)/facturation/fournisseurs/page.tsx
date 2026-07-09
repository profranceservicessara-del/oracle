import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Purchase, SupplierInvoice } from "@/lib/types";
import { FournisseursClient } from "./fournisseurs-client";

// Cobrança > Faturas recebidas — faturas de fornecedores / despesas.
// V1 read-only: derivado 100% de `purchases` (mesma fonte das saídas do
// /financeiro, números consistentes). Sem tabela/coluna nova. O schema de
// purchases não guarda status/vencimento, então toda compra registrada é
// tratada como despesa já paga ("Paga").
export default async function FournisseursPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: purchases }, invoicesRes] = await Promise.all([
    supabase.from("purchases").select("*").order("date_achat", { ascending: false }),
    // V2: faturas dedicadas. Fallback graceful — se a query falhar (ex.: tabela
    // ausente em algum ambiente) ou vier vazia, a página usa o modo V1 (purchases).
    supabase.from("supplier_invoices").select("*").order("date_reception", { ascending: false })
  ]);

  const invoices = (invoicesRes.error ? [] : invoicesRes.data ?? []) as SupplierInvoice[];

  return (
    <FournisseursClient
      initialInvoices={invoices}
      initialPurchases={(purchases ?? []) as Purchase[]}
      userId={user.id}
    />
  );
}
