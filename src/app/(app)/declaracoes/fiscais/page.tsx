import { redirect } from "next/navigation";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { createClient } from "@/lib/supabase/server";
import { DeclaracoesFiscaisClient, type FaturaRow, type DespesaRow } from "./fiscais-client";

// Contabilidade > Declarações fiscais — hub de PREPARAÇÃO (somente leitura).
// NÃO calcula imposto/contribuição, não tem alíquota, não conecta à URSSAF.
// Deriva 100% de dados existentes: payments (receitas), documents/facture
// (faturas emitidas/em aberto/comprovantes), purchases (despesas).
export default async function DeclaracoesFiscaisPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [receitas, docsRes, paidRes, purchasesRes] = await Promise.all([
    fetchRevenueBookRows(supabase),
    supabase
      .from("documents")
      .select("id, numero, status, date_emission, total_ttc, pdf_path")
      .eq("type", "facture")
      .neq("status", "draft")
      .order("date_emission", { ascending: false }),
    supabase.from("payments").select("document_id, montant"),
    supabase.from("purchases").select("date_achat, fournisseur, designation, montant").order("date_achat", { ascending: false })
  ]);

  // Total pago por fatura (p/ derivar o valor em aberto).
  const paidByDoc = new Map<string, number>();
  for (const p of (paidRes.data ?? []) as Array<{ document_id: string; montant: number }>) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }

  const faturas: FaturaRow[] = ((docsRes.error ? [] : docsRes.data ?? []) as Array<{
    id: string;
    numero: string | null;
    status: string;
    date_emission: string | null;
    total_ttc: number;
    pdf_path: string | null;
  }>).map((d) => {
    const total = Number(d.total_ttc) || 0;
    const due = total - (paidByDoc.get(d.id) ?? 0);
    return {
      id: d.id,
      numero: d.numero ?? "Sem número",
      date: d.date_emission ?? "",
      status: d.status,
      total,
      aberto: ["sent", "partial"].includes(d.status) ? Math.max(0, due) : 0,
      hasPdf: Boolean(d.pdf_path)
    };
  });

  const despesas: DespesaRow[] = ((purchasesRes.data ?? []) as Array<{
    date_achat: string;
    fournisseur: string;
    designation: string;
    montant: number;
  }>).map((p) => ({
    date: p.date_achat,
    fournisseur: p.fournisseur,
    designation: p.designation,
    montant: Number(p.montant) || 0
  }));

  const receitasRows = receitas.map((r) => ({ date: r.date, numero: r.numero, clientName: r.clientName, montant: Number(r.montant) || 0 }));

  return <DeclaracoesFiscaisClient despesas={despesas} faturas={faturas} receitas={receitasRows} />;
}
