import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Purchase } from "@/lib/types";
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

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .order("date_achat", { ascending: false });

  return <FournisseursClient initialPurchases={(purchases ?? []) as Purchase[]} />;
}
