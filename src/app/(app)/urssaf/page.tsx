import { redirect } from "next/navigation";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { createClient } from "@/lib/supabase/server";
import { UrssafClient } from "./urssaf-client";

// Gestão > URSSAF & Declarações — preparação de declaração (somente ajuda;
// NÃO calcula contribuições nem substitui a URSSAF). Deriva os recebimentos
// (payments, via livre de recettes) por período. Read-only, sem tabela nova.
export default async function UrssafPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rows = await fetchRevenueBookRows(supabase);

  return <UrssafClient initialRows={rows} />;
}
