import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroClient, type CashMovement } from "./financeiro-client";

// Gestão > Fluxo de Caixa — visão real combinando recebimentos (payments, das
// faturas) como entradas e compras (purchases) como saídas. Sem tabela nova.
export default async function FinanceiroPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: payments }, { data: purchases }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, date_encaissement, montant, moyen, documents(numero)")
      .order("date_encaissement", { ascending: false }),
    supabase.from("purchases").select("*").order("date_achat", { ascending: false })
  ]);

  const entradas: CashMovement[] = (payments ?? []).map((p) => {
    const row = p as unknown as {
      id: string;
      date_encaissement: string;
      montant: number;
      moyen: string | null;
      documents: { numero: string | null } | { numero: string | null }[] | null;
    };
    const doc = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    return {
      id: `in-${row.id}`,
      date: row.date_encaissement,
      kind: "in",
      label: doc?.numero ? `Recebimento · ${doc.numero}` : "Recebimento",
      method: row.moyen ?? null,
      amount: Number(row.montant) || 0
    };
  });

  const saidas: CashMovement[] = (purchases ?? []).map((p) => {
    const row = p as { id: string; date_achat: string; montant: number; moyen: string | null; fournisseur: string; designation: string };
    return {
      id: `out-${row.id}`,
      date: row.date_achat,
      kind: "out",
      label: [row.fournisseur, row.designation].filter(Boolean).join(" · ") || "Compra",
      method: row.moyen ?? null,
      amount: Number(row.montant) || 0
    };
  });

  return <FinanceiroClient initialMovements={[...entradas, ...saidas]} userId={user.id} />;
}
