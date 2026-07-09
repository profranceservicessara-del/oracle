import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComprovantesClient, type Comprovante } from "./comprovantes-client";

// Contabilidade > Comprovantes — central read-only de justificativos que já
// existem no sistema: faturas emitidas com PDF (documents.pdf_path) = receita,
// e faturas de fornecedor com anexo (supplier_invoices.fichier_path) = despesa.
// Sem tabela/upload/bucket novo. Abertura via link assinado temporário.
export default async function ComprovantesPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [docsRes, invRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, numero, type, date_emission, total_ttc, pdf_path")
      .not("pdf_path", "is", null)
      .order("date_emission", { ascending: false }),
    supabase
      .from("supplier_invoices")
      .select("id, fournisseur, reference, date_reception, montant_ttc, fichier_path")
      .not("fichier_path", "is", null)
      .order("date_reception", { ascending: false })
  ]);

  const typeLabels: Record<string, string> = { facture: "Fatura", devis: "Orçamento", avoir: "Nota de crédito" };

  const receitas: Comprovante[] = (docsRes.error ? [] : docsRes.data ?? []).map((d) => {
    const doc = d as { id: string; numero: string | null; type: string; date_emission: string | null; total_ttc: number };
    return {
      id: doc.id,
      kind: "receita",
      date: doc.date_emission ?? "",
      label: doc.numero ?? typeLabels[doc.type] ?? "Documento",
      sub: typeLabels[doc.type] ?? doc.type,
      montant: Number(doc.total_ttc) || 0,
      source: "document",
      path: null
    };
  });

  const despesas: Comprovante[] = (invRes.error ? [] : invRes.data ?? []).map((i) => {
    const inv = i as { id: string; fournisseur: string; reference: string | null; date_reception: string; montant_ttc: number; fichier_path: string | null };
    return {
      id: inv.id,
      kind: "despesa",
      date: inv.date_reception,
      label: inv.fournisseur,
      sub: inv.reference ?? "Anexo",
      montant: Number(inv.montant_ttc) || 0,
      source: "supplier_invoice",
      path: inv.fichier_path
    };
  });

  const items = [...receitas, ...despesas].sort((a, b) => (a.date < b.date ? 1 : -1));

  return <ComprovantesClient items={items} />;
}
