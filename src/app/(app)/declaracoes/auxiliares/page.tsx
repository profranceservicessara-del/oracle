import { redirect } from "next/navigation";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { createClient } from "@/lib/supabase/server";
import { AuxiliaresClient, type AuxRow } from "./auxiliares-client";

// Contabilidade > Declarações auxiliares — hub read-only de apoio. Agrega
// contagens/valores dos dados existentes (receitas, faturas, despesas,
// comprovantes, faturas de fornecedor) + links. NÃO calcula imposto, sem
// alíquota, sem URSSAF/API. Não expõe paths de storage (só flags/contagens).
export default async function DeclaracoesAuxiliaresPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [receitas, docsRes, paidRes, purchasesRes, invRes] = await Promise.all([
    fetchRevenueBookRows(supabase),
    supabase.from("documents").select("id, status, date_emission, total_ttc, pdf_path").eq("type", "facture").neq("status", "draft"),
    supabase.from("payments").select("document_id, montant"),
    supabase.from("purchases").select("date_achat, montant"),
    supabase.from("supplier_invoices").select("date_reception, montant_ttc, status, fichier_path")
  ]);

  const paidByDoc = new Map<string, number>();
  for (const p of (paidRes.data ?? []) as Array<{ document_id: string; montant: number }>) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }

  const receitasRows: AuxRow[] = receitas.map((r) => ({ date: r.date, montant: Number(r.montant) || 0, flag: false, pend: false }));

  const faturas: AuxRow[] = ((docsRes.error ? [] : docsRes.data ?? []) as Array<{
    id: string;
    status: string;
    date_emission: string | null;
    total_ttc: number;
    pdf_path: string | null;
  }>).map((d) => {
    const total = Number(d.total_ttc) || 0;
    const aberto = ["sent", "partial"].includes(d.status) ? Math.max(0, total - (paidByDoc.get(d.id) ?? 0)) : 0;
    return { date: d.date_emission ?? "", montant: total, flag: Boolean(d.pdf_path), pend: aberto > 0.01 };
  });

  const despesas: AuxRow[] = ((purchasesRes.data ?? []) as Array<{ date_achat: string; montant: number }>).map((p) => ({
    date: p.date_achat,
    montant: Number(p.montant) || 0,
    flag: false,
    pend: false
  }));

  const faturasRecebidas: AuxRow[] = ((invRes.error ? [] : invRes.data ?? []) as Array<{
    date_reception: string;
    montant_ttc: number;
    status: string;
    fichier_path: string | null;
  }>).map((i) => ({
    date: i.date_reception,
    montant: Number(i.montant_ttc) || 0,
    flag: Boolean(i.fichier_path), // só flag booleana — nunca o path
    pend: i.status === "a_payer"
  }));

  return (
    <AuxiliaresClient
      despesas={despesas}
      faturas={faturas}
      faturasRecebidas={faturasRecebidas}
      receitas={receitasRows}
    />
  );
}
