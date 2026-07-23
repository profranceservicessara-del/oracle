import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadClientAging, loadSupplierAging } from "./aging-data";
import { VencimentosClient } from "./vencimentos-client";

// Vencimentos (balance âgée): saldos em aberto por faixa de atraso, a receber
// (faturas de venda) e a pagar (faturas de fornecedor + Compras). Só leitura.
export default async function VencimentosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [clientAging, supplierAging] = await Promise.all([loadClientAging(), loadSupplierAging()]);

  return <VencimentosClient clientAging={clientAging} supplierAging={supplierAging} />;
}
